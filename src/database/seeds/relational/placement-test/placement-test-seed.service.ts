import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import {
  PlacementEntity,
  PlacementQuestionJson,
} from '../../../../placement/infrastructure/persistence/relational/entities/placement.entity';

@Injectable()
export class PlacementTestSeedService {
  constructor(
    @InjectRepository(PlacementEntity)
    private readonly placementRepository: Repository<PlacementEntity>,
  ) {}

  /**
   * Flushes all placement records (cascades to student_answers) then inserts
   * the real 15-question multiple-choice placement test.
   */
  async run(): Promise<void> {
    await this.placementRepository.query('DELETE FROM "placement"');

    const questions = this._buildQuestions();

    await this.placementRepository.save(
      this.placementRepository.create({
        title: 'Placement Test',
        description:
          'One-time entry assessment with timed questions for level grading.',
        passingScore: 60,
        examDurationMinutes: 50,
        quizDescription: 'Placement exam description for learners',
        courseTitle: 'Placement Course',
        courseLevel: 'all',
        questions,
      }),
    );

    console.log(`Placement test seeded with ${questions.length} questions.`);
  }

  private _buildQuestions(): PlacementQuestionJson[] {
    const now = new Date().toISOString();

    const q = (
      prompt: string,
      options: string[],
      correctAnswer: string,
    ): PlacementQuestionJson => ({
      id: randomUUID(),
      prompt,
      options: JSON.stringify({ type: 'single', options }),
      correctAnswer,
      createdAt: now,
      updatedAt: now,
    });

    return [
      q(
        'She ______ coffee every morning.',
        ['drinks', 'drinking', 'drink'],
        'drinks',
      ),
      q('They ______ happy today.', ['is', 'am', 'are'], 'are'),
      q('The opposite of "big" is:', ['tall', 'small', 'fast'], 'small'),
      q('I went ______ the store yesterday.', ['to', 'for', 'at'], 'to'),
      q(
        'Choose the correct word: I need to _______ my homework now.',
        ['work', 'take', 'do'],
        'do',
      ),
      q('I have lived here ______ 2019.', ['since', 'for', 'at'], 'since'),
      q("There isn't ______ sugar left.", ['many', 'much', 'few'], 'much'),
      q(
        '"Crowded" means:',
        ['very quiet', 'very clean', 'full of people'],
        'full of people',
      ),
      q('He asked me where I ___ from.', ['am', 'was', 'were'], 'was'),
      q(
        'Choose the correct sentence:',
        ['She enjoys to read.', 'She enjoys reading.', 'She enjoy reading.'],
        'She enjoys reading.',
      ),
      q(
        'If I ___ more money, I would buy a car.',
        ['have', 'had', 'will have'],
        'had',
      ),
      q(
        'The project ___ by the team already.',
        ['has finished', 'has been finished', 'was finishing'],
        'has been finished',
      ),
      q(
        'The opposite of "increase" is:',
        ['rise', 'grow', 'decrease'],
        'decrease',
      ),
      q(
        'Read:\nTom had never traveled abroad before last year. When he finally did, he realized how different cultures can be.\nHad Tom traveled abroad before last year?',
        ['Yes', 'No'],
        'No',
      ),
      q(
        'Read:\nTom had never traveled abroad before last year. When he finally did, he realized how different cultures can be.\nWhat did Tom realize after traveling?',
        [
          'Traveling is expensive',
          'Cultures can be different',
          'People are unfriendly',
        ],
        'Cultures can be different',
      ),
    ];
  }
}
