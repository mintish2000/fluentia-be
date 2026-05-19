import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { StudentGroupEntity } from '../student-groups/infrastructure/persistence/relational/entities/student-group.entity';
import { RoleEnum } from '../roles/roles.enum';
import { StatusEnum } from '../statuses/statuses.enum';
import { PlacementService } from '../placement/placement.service';
import { StudentAnswerRepository } from '../student-answers/infrastructure/persistence/student-answer.repository';
import { PaymentRepository } from '../payments/infrastructure/persistence/payment.repository';
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
    void from;
    void to;

    const students = await this.usersRepository.find({
      where: { role: { id: RoleEnum.student } },
      relations: ['status', 'group'],
    });

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

    const revenueRows = await this.paymentRepository.getRevenueGroupedByMonth();
    const revenueByMonthMap = new Map<string, number>(
      revenueRows.map((r) => [r.month, r.totalAmount]),
    );

    const revenueByMonth = [
      {
        month: monthKey,
        label: monthLabels[now.getUTCMonth()],
        amountUsd: revenueByMonthMap.get(monthKey) ?? expectedMonthlyRevenueUsd,
      },
    ];

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
}
