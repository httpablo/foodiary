import { Profile } from '@application/entities/Profile';
import { WeightGoal } from '@application/entities/WeightGoal';

export class GoalCalculator {
  private static macroRatios: Record<Profile.Goal, GoalCalculator.MacroRatio> = {
    [Profile.Goal.LOSE]: {
      proteins: 2,
      fats: 0.8,
    },
    [Profile.Goal.GAIN]: {
      proteins: 2.2,
      fats: 1,
    },
    [Profile.Goal.MAINTAIN]: {
      proteins: 2,
      fats: 0.9,
    },
  } as const;

  private static activityMultipliers: Record<Profile.ActivityLevel, number> = {
    [Profile.ActivityLevel.SEDENTARY]: 1.2,
    [Profile.ActivityLevel.LIGHT]: 1.375,
    [Profile.ActivityLevel.MODERATE]: 1.55,
    [Profile.ActivityLevel.HEAVY]: 1.725,
    [Profile.ActivityLevel.ATHLETE]: 1.9,
  };

  private static kcalPerKg = 7700;

  private static calorieFloors: Record<Profile.Gender, number> = {
    [Profile.Gender.FEMALE]: 1200,
    [Profile.Gender.MALE]: 1500,
  };

  static calculate(
    profile: Profile,
    weightGoal?: GoalCalculator.WeightGoalInput | null,
  ): GoalCalculator.CalculateGoalResult {
    const { weight } = profile;
    const goal = weightGoal ? Profile.Goal[weightGoal.direction] : profile.goal;
    const { proteins, fats } = this.macroRatios[goal];

    const calories = this.calcCalories(profile, goal, weightGoal);

    const proteinGrams = Math.round(weight * proteins);
    const proteinCalories = proteinGrams * 4;

    const fatGrams = Math.round(weight * fats);
    const fatCalories = fatGrams * 9;

    const remainingCalories = calories - proteinCalories - fatCalories;

    const carbsGrams = Math.max(0, Math.round(remainingCalories / 4));
    const carbsCalories = carbsGrams * 4;

    const realCalories = proteinCalories + fatCalories + carbsCalories;

    return {
      calories: realCalories,
      carbohydrates: carbsGrams,
      fats: fatGrams,
      proteins: proteinGrams,
    };
  }

  static calcAge(birthDate: Date, today = new Date()): number {
    let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
    const birthdayPending = today.getUTCMonth() < birthDate.getUTCMonth()
      || (today.getUTCMonth() === birthDate.getUTCMonth() && today.getUTCDate() < birthDate.getUTCDate());

    if (birthdayPending) {
      age -= 1;
    }

    return Math.max(age, 0);
  }

  private static calcCalories(
    {
      height,
      weight,
      gender,
      birthDate,
      activityLevel,
    }: Profile,
    goal: Profile.Goal,
    weightGoal?: GoalCalculator.WeightGoalInput | null,
  ): number {
    const age = this.calcAge(birthDate);

    const bmr =
      gender === Profile.Gender.MALE
        ? 88.36 + 13.4 * weight + 4.8 * height - 5.7 * age
        : 447.6 + 9.2 * weight + 3.1 * height - 4.3 * age;

    const tdee = bmr * this.activityMultipliers[activityLevel];

    if (goal === Profile.Goal.MAINTAIN) {
      return Math.round(tdee);
    }

    const adjustment = weightGoal
      ? (weightGoal.paceKgPerWeek * this.kcalPerKg) / 7
      : 500;

    if (goal === Profile.Goal.GAIN) {
      return Math.round(tdee + adjustment);
    }

    const floor = Math.max(bmr, this.calorieFloors[gender]);

    return Math.round(Math.max(tdee - adjustment, floor));
  }
}

export namespace GoalCalculator {
  export type CalculateGoalResult = {
    calories: number;
    proteins: number;
    carbohydrates: number;
    fats: number;
  };

  export type WeightGoalInput = {
    direction: WeightGoal.Direction;
    paceKgPerWeek: number;
  };

  export type MacroRatio = {
    proteins: number;
    fats: number;
  };
}
