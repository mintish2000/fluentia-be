import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { StudentGroupEntity } from '../student-groups/infrastructure/persistence/relational/entities/student-group.entity';
import { RoleEnum } from '../roles/roles.enum';
import { StatusEnum } from '../statuses/statuses.enum';
import { PlacementService } from '../placement/placement.service';
import { StudentAnswerRepository } from '../student-answers/infrastructure/persistence/student-answer.repository';
import { PaymentRepository } from '../payments/infrastructure/persistence/payment.repository';
import { PaymentStatusEnum } from '../payments/payment-status.enum';
import { toGroupPublicId } from './utils/admin-public-ids.util';

/**
 * Aggregates KPIs and chart series for `GET /admin/dashboard`.
 */
@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(StudentGroupEntity)
    private readonly groupsRepository: Repository<StudentGroupEntity>,
    private readonly placementService: PlacementService,
    private readonly studentAnswerRepository: StudentAnswerRepository,
    private readonly paymentRepository: PaymentRepository,
  ) {}

  /**
   * Builds dashboard aggregates for the admin home screen.
   */
  async getDashboard(from?: string, to?: string) {
    const range = this.parseDateRange(from, to);

    const studentsQuery = this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.status', 'status')
      .leftJoinAndSelect('user.group', 'group')
      .leftJoin('user.role', 'role')
      .where('role.id = :roleId', { roleId: RoleEnum.student });

    if (range.from) {
      studentsQuery.andWhere('user.createdAt >= :from', {
        from: range.from,
      });
    }

    if (range.to) {
      studentsQuery.andWhere('user.createdAt <= :to', {
        to: range.to,
      });
    }

    const students = await studentsQuery.getMany();

    const totalStudents = students.length;
    const activeStudents = students.filter(
      (s) => Number(s.status?.id) === StatusEnum.active,
    ).length;
    const inactiveStudents = students.filter(
      (s) => Number(s.status?.id) === StatusEnum.inactive,
    ).length;

    const groupsCount = await this.groupsRepository.count();

    const activePlacement = await this.placementService.findPlacementTest();
    let averagePlacementScore = 0;
    const placementScoreBuckets = [
      { label: '0–40%', count: 0 },
      { label: '40–60%', count: 0 },
      { label: '60–80%', count: 0 },
      { label: '80–100%', count: 0 },
    ];

    if (activePlacement) {
      const scoreSummary =
        await this.studentAnswerRepository.getPlacementScoreSummary(
          activePlacement.id,
          range,
        );
      const scores: number[] = [];
      for (const { total, correct } of scoreSummary) {
        if (!total) continue;
        const score = Math.round((correct / total) * 100);
        scores.push(score);
        if (score < 40) {
          placementScoreBuckets[0].count += 1;
        } else if (score < 60) {
          placementScoreBuckets[1].count += 1;
        } else if (score < 80) {
          placementScoreBuckets[2].count += 1;
        } else {
          placementScoreBuckets[3].count += 1;
        }
      }
      if (scores.length) {
        averagePlacementScore =
          Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) /
          10;
      }
    }

    const expectedMonthlyRevenueUsd = students
      .filter((s) => Number(s.status?.id) === StatusEnum.active)
      .reduce((sum, s) => sum + (s.nextPaymentAmount ?? 0), 0);

    const defaultColors = [
      '#0b3a66',
      '#0d6b4d',
      '#a61b1b',
      '#6b4d0d',
      '#4d0d6b',
    ];
    let colorIdx = 0;
    const byGroupMap = new Map<
      string,
      { groupId: string; groupName: string; count: number; color: string }
    >();
    for (const s of students) {
      if (!s.group?.id) {
        continue;
      }
      const gid = toGroupPublicId(s.group.id);
      const existing = byGroupMap.get(gid);
      if (existing) {
        existing.count += 1;
      } else {
        byGroupMap.set(gid, {
          groupId: gid,
          groupName: s.group.name,
          count: 1,
          color: defaultColors[colorIdx++ % defaultColors.length],
        });
      }
    }

    const now = new Date();
    const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const monthLabels = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    const revenueRows = await this.paymentRepository.getRevenueGroupedByMonth({
      ...range,
      status: PaymentStatusEnum.paid,
    });
    const revenueByMonthMap = new Map<string, number>(
      revenueRows.map((r) => [r.month, r.totalAmount]),
    );

    const rangeMonthKeys = this.getMonthKeysInRange(range.from, range.to);
    const targetMonthKeys = rangeMonthKeys.length ? rangeMonthKeys : [monthKey];

    const revenueByMonth = targetMonthKeys.map((key) => {
      const [, monthRaw] = key.split('-');
      const monthIndex = Number(monthRaw) - 1;
      return {
        month: key,
        label: monthLabels[monthIndex],
        amountUsd:
          revenueByMonthMap.get(key) ??
          (key === monthKey ? expectedMonthlyRevenueUsd : 0),
      };
    });

    return {
      meta: {
        title: 'Learning overview',
        subtitle: 'Snapshot for coaching and placement operations',
        generatedAt: new Date().toISOString(),
      },
      kpis: {
        totalStudents,
        activeStudents,
        inactiveStudents,
        totalGroups: groupsCount,
        averagePlacementScore,
        expectedMonthlyRevenueUsd,
      },
      studentsByGroup: [...byGroupMap.values()],
      studentsByStatus: [
        {
          status: 'active',
          label: 'Active',
          count: activeStudents,
          color: '#0d6b4d',
        },
        {
          status: 'inactive',
          label: 'Inactive',
          count: inactiveStudents,
          color: '#a61b1b',
        },
      ],
      placementScoreDistribution: placementScoreBuckets,
      revenueByMonth,
    };
  }

  private parseDateRange(
    from?: string,
    to?: string,
  ): {
    from?: Date;
    to?: Date;
  } {
    const parsedFrom = from ? this.parseDateBoundary(from, 'start') : undefined;
    const parsedTo = to ? this.parseDateBoundary(to, 'end') : undefined;

    if (parsedFrom && parsedTo && parsedFrom > parsedTo) {
      throw new BadRequestException('`from` must be before or equal to `to`.');
    }

    return { from: parsedFrom, to: parsedTo };
  }

  private parseDateBoundary(value: string, boundary: 'start' | 'end'): Date {
    const trimmed = value.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      throw new BadRequestException(
        `Invalid date \"${value}\". Use YYYY-MM-DD format.`,
      );
    }

    const [yearRaw, monthRaw, dayRaw] = trimmed.split('-');
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    const day = Number(dayRaw);
    const date =
      boundary === 'start'
        ? new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
        : new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    if (
      Number.isNaN(date.getTime()) ||
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() + 1 !== month ||
      date.getUTCDate() !== day
    ) {
      throw new BadRequestException(
        `Invalid date \"${value}\". Use a valid calendar date.`,
      );
    }

    return date;
  }

  private getMonthKeysInRange(from?: Date, to?: Date): string[] {
    if (!from || !to) {
      return [];
    }

    const keys: string[] = [];
    const cursor = new Date(
      Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1),
    );
    const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));

    while (cursor <= end) {
      keys.push(
        `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`,
      );
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }

    return keys;
  }
}
