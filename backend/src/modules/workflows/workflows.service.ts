import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AuthUser } from '../../common/decorators';
import { buildMeta, escapeRegex, parseSort } from '../../common/dto/pagination.dto';
import { ApproverType, PRIVILEGED_ROLES, RequestStatus } from '../../common/enums';
import { NotificationsService } from '../notifications/notifications.module';
import { User } from '../users/schemas/user.schema';
import {
  CreateRequestDto,
  CreateWorkflowTemplateDto,
  QueryRequestDto,
  UpdateWorkflowTemplateDto,
} from './dto/workflow.dto';
import {
  FormField,
  RequestDocument,
  RequestStep,
  StepStatus,
  WorkflowStep,
  WorkflowTemplate,
  WorkRequest,
} from './schemas/workflow.schema';

@Injectable()
export class WorkflowsService {
  constructor(
    @InjectModel(WorkflowTemplate.name) private templateModel: Model<WorkflowTemplate>,
    @InjectModel(WorkRequest.name) private requestModel: Model<WorkRequest>,
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly notifications: NotificationsService,
  ) {}

  /* ---------------- Templates ---------------- */

  listTemplates(includeInactive = false) {
    return this.templateModel.find(includeInactive ? {} : { isActive: true }).sort({ name: 1 }).lean();
  }

  async getTemplate(id: string) {
    const t = await this.templateModel.findById(id);
    if (!t) throw new NotFoundException('Không tìm thấy mẫu quy trình');
    return t;
  }

  createTemplate(dto: CreateWorkflowTemplateDto) {
    this.validateTemplate(dto);
    return this.templateModel.create(dto);
  }

  async updateTemplate(id: string, dto: UpdateWorkflowTemplateDto) {
    const t = await this.getTemplate(id);
    t.set(dto);
    this.validateTemplate(t);
    await t.save();
    return t;
  }

  private validateTemplate(dto: { formFields?: FormField[] | unknown[]; steps?: WorkflowStep[] | unknown[] }) {
    const keys = (dto.formFields as FormField[] | undefined)?.map((f) => f.key) ?? [];
    if (new Set(keys).size !== keys.length) throw new BadRequestException('Trùng key trường form');
    const orders = (dto.steps as WorkflowStep[] | undefined)?.map((s) => s.order) ?? [];
    if (new Set(orders).size !== orders.length) throw new BadRequestException('Trùng thứ tự bước duyệt');
  }

  /* ---------------- Requests: query ---------------- */

  async listRequests(user: AuthUser, q: QueryRequestDto) {
    const filter: FilterQuery<WorkRequest> = {};
    const uid = new Types.ObjectId(user.sub);
    if (q.scope === 'pending') {
      filter.status = RequestStatus.PENDING;
      filter.currentApproverIds = uid;
    } else if (q.scope === 'all') {
      if (!PRIVILEGED_ROLES.includes(user.role)) {
        // Người thường: đơn của mình + đơn mình từng/đang được giao duyệt
        filter.$or = [{ requesterId: uid }, { 'steps.approverIds': uid }];
      }
    } else {
      filter.requesterId = uid;
    }
    if (q.status && q.scope !== 'pending') filter.status = q.status;
    if (q.type) filter.type = q.type;
    if (q.q) {
      const rx = new RegExp(escapeRegex(q.q), 'i');
      filter.$and = [{ $or: [{ title: rx }, { code: rx }] }];
    }
    const sort = parseSort(q.sort, ['createdAt', 'status', 'code']);
    const [data, total] = await Promise.all([
      this.requestModel
        .find(filter)
        .sort(sort)
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .populate('requesterId', 'fullName email')
        .lean(),
      this.requestModel.countDocuments(filter),
    ]);
    return { data, meta: buildMeta(q.page, q.limit, total) };
  }

  async getRequest(user: AuthUser, id: string) {
    const r = await this.requestModel
      .findById(id)
      .populate('requesterId', 'fullName email departmentId')
      .populate('steps.approverIds', 'fullName email')
      .populate('steps.actedBy', 'fullName email');
    if (!r) throw new NotFoundException('Không tìm thấy đơn');
    const related =
      PRIVILEGED_ROLES.includes(user.role) ||
      String((r.requesterId as unknown as { _id: Types.ObjectId })._id) === user.sub ||
      r.steps.some((s) =>
        (s.approverIds as unknown as { _id: Types.ObjectId }[]).some((a) => String(a._id) === user.sub),
      );
    if (!related) throw new ForbiddenException('Bạn không có quyền xem đơn này');
    return r;
  }

  /* ---------------- Requests: actions ---------------- */

  async createRequest(user: AuthUser, dto: CreateRequestDto) {
    const template = await this.getTemplate(dto.templateId);
    if (!template.isActive) throw new BadRequestException('Mẫu quy trình đã ngừng sử dụng');
    const formData = this.validateFormData(template.formFields, dto.formData);
    const requester = await this.userModel.findById(user.sub, 'managerId departmentId fullName');
    if (!requester) throw new NotFoundException('Không tìm thấy người tạo đơn');

    const amount = Number(formData.amount ?? 0);
    const steps: RequestStep[] = [];
    for (const s of [...template.steps].sort((a, b) => a.order - b.order)) {
      const approverIds = await this.resolveApprovers(s, requester, user.sub);
      const skip = !approverIds.length || (s.minAmount != null && amount < s.minAmount);
      steps.push({
        order: s.order,
        name: s.name,
        approverIds,
        status: skip ? StepStatus.SKIPPED : StepStatus.WAITING,
      });
    }
    const first = steps.findIndex((s) => s.status === StepStatus.WAITING);
    if (first === -1) {
      throw new BadRequestException(
        'Không xác định được người duyệt cho đơn này, liên hệ quản trị viên',
      );
    }
    steps[first].status = StepStatus.PENDING;

    const request = await this.requestModel.create({
      code: this.generateCode(),
      templateId: template._id,
      templateName: template.name,
      type: template.type,
      title: dto.title,
      requesterId: user.sub,
      formData,
      steps,
      currentStep: first,
      currentApproverIds: steps[first].approverIds,
    });
    await this.notifyApprovers(request, user.sub);
    return request;
  }

  async approve(user: AuthUser, id: string, comment?: string) {
    const r = await this.getActionable(user, id);
    const steps = r.toObject().steps as RequestStep[];
    const cur = r.currentStep;
    steps[cur] = {
      ...steps[cur],
      status: StepStatus.APPROVED,
      actedBy: new Types.ObjectId(user.sub),
      comment,
      actedAt: new Date(),
    };
    const next = steps.findIndex((s, i) => i > cur && s.status === StepStatus.WAITING);
    const done = next === -1;
    if (!done) steps[next].status = StepStatus.PENDING;

    const updated = await this.atomicUpdate(r, user, {
      steps,
      currentStep: done ? -1 : next,
      currentApproverIds: done ? [] : steps[next].approverIds,
      status: done ? RequestStatus.APPROVED : RequestStatus.PENDING,
      ...(done ? { completedAt: new Date() } : {}),
    });
    if (done) {
      await this.notifications.notify(
        [updated.requesterId],
        {
          type: 'request_approved',
          title: `Đơn ${updated.code} đã được phê duyệt`,
          link: `/requests/${updated.id}`,
        },
        user.sub,
      );
    } else {
      await this.notifyApprovers(updated, user.sub);
    }
    return updated;
  }

  async reject(user: AuthUser, id: string, comment?: string) {
    if (!comment?.trim()) throw new BadRequestException('Vui lòng nhập lý do từ chối');
    const r = await this.getActionable(user, id);
    const steps = r.toObject().steps as RequestStep[];
    steps[r.currentStep] = {
      ...steps[r.currentStep],
      status: StepStatus.REJECTED,
      actedBy: new Types.ObjectId(user.sub),
      comment,
      actedAt: new Date(),
    };
    const updated = await this.atomicUpdate(r, user, {
      steps,
      currentStep: -1,
      currentApproverIds: [],
      status: RequestStatus.REJECTED,
      completedAt: new Date(),
    });
    await this.notifications.notify(
      [updated.requesterId],
      {
        type: 'request_rejected',
        title: `Đơn ${updated.code} bị từ chối`,
        message: comment,
        link: `/requests/${updated.id}`,
      },
      user.sub,
    );
    return updated;
  }

  async cancel(user: AuthUser, id: string) {
    const r = await this.requestModel.findOneAndUpdate(
      { _id: id, requesterId: user.sub, status: RequestStatus.PENDING },
      {
        status: RequestStatus.CANCELLED,
        currentApproverIds: [],
        currentStep: -1,
        completedAt: new Date(),
      },
      { new: true },
    );
    if (!r) throw new BadRequestException('Chỉ người tạo được hủy đơn đang chờ duyệt');
    return r;
  }

  /* ---------------- Helpers ---------------- */

  private async getActionable(user: AuthUser, id: string): Promise<RequestDocument> {
    const r = await this.requestModel.findById(id);
    if (!r) throw new NotFoundException('Không tìm thấy đơn');
    if (r.status !== RequestStatus.PENDING) throw new BadRequestException('Đơn đã được xử lý');
    if (!r.currentApproverIds.map(String).includes(user.sub)) {
      throw new ForbiddenException('Bạn không phải người duyệt ở bước hiện tại');
    }
    return r;
  }

  /** Cập nhật có điều kiện để tránh 2 người duyệt cùng lúc (không cần transaction). */
  private async atomicUpdate(r: RequestDocument, user: AuthUser, set: Partial<WorkRequest>) {
    const updated = await this.requestModel.findOneAndUpdate(
      {
        _id: r._id,
        status: RequestStatus.PENDING,
        currentStep: r.currentStep,
        currentApproverIds: new Types.ObjectId(user.sub),
      },
      { $set: set },
      { new: true },
    );
    if (!updated) throw new ConflictException('Đơn vừa được người khác xử lý, vui lòng tải lại');
    return updated;
  }

  private async resolveApprovers(
    step: WorkflowStep,
    requester: { managerId?: Types.ObjectId | null; departmentId?: Types.ObjectId | null },
    requesterId: string,
  ): Promise<Types.ObjectId[]> {
    let ids: Types.ObjectId[] = [];
    if (step.approverType === ApproverType.MANAGER) {
      if (requester.managerId) {
        ids = [requester.managerId];
      } else if (requester.departmentId) {
        // Không có quản lý trực tiếp -> trưởng phòng
        const dept = await this.userModel.db
          .collection('departments')
          .findOne({ _id: requester.departmentId }, { projection: { headId: 1 } });
        if (dept?.headId) ids = [dept.headId as Types.ObjectId];
      }
    } else if (step.approverType === ApproverType.ROLE && step.approverRole) {
      const users = await this.userModel
        .find({ role: step.approverRole, isActive: true }, '_id')
        .lean();
      ids = users.map((u) => u._id);
    } else if (step.approverType === ApproverType.USER && step.approverId) {
      ids = [step.approverId];
    }
    if (ids.length) {
      // Chỉ giữ user đang hoạt động và không cho tự duyệt đơn của mình
      const active = await this.userModel.find({ _id: { $in: ids }, isActive: true }, '_id').lean();
      ids = active.map((u) => u._id).filter((id) => String(id) !== requesterId);
    }
    return ids;
  }

  /** Kiểm tra formData theo định nghĩa template, loại bỏ trường lạ. */
  private validateFormData(fields: FormField[], data: Record<string, unknown>) {
    const result: Record<string, unknown> = {};
    const errors: string[] = [];
    for (const f of fields) {
      const v = data?.[f.key];
      if (v === undefined || v === null || v === '') {
        if (f.required) errors.push(`${f.label} là bắt buộc`);
        continue;
      }
      switch (f.type) {
        case 'number': {
          const n = Number(v);
          if (Number.isNaN(n)) errors.push(`${f.label} phải là số`);
          else result[f.key] = n;
          break;
        }
        case 'date':
          if (Number.isNaN(Date.parse(String(v)))) errors.push(`${f.label} không phải ngày hợp lệ`);
          else result[f.key] = String(v);
          break;
        case 'select':
          if (!f.options.includes(String(v))) errors.push(`${f.label} không hợp lệ`);
          else result[f.key] = String(v);
          break;
        default:
          result[f.key] = String(v).slice(0, 5000);
      }
    }
    if (errors.length) throw new BadRequestException(errors);
    return result;
  }

  private generateCode() {
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(
      d.getDate(),
    ).padStart(2, '0')}`;
    const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `REQ-${ymd}-${rand}`;
  }

  private notifyApprovers(r: RequestDocument, actorId: string) {
    return this.notifications.notify(
      r.currentApproverIds,
      {
        type: 'request_pending',
        title: `Đơn ${r.code} chờ bạn duyệt: ${r.title}`,
        link: `/requests/${r.id}`,
      },
      actorId,
    );
  }
}
