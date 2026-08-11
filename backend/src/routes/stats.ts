import { Router } from 'express';
import { query } from '../db';
import { AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/summary', async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const days = parseInt(req.query.days as string) || 30;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [weight, water, food, fitness, periods] = await Promise.all([
    query(
      `SELECT weight_kg, logged_at FROM weight_logs
       WHERE user_id = $1 AND deleted_at IS NULL AND logged_at >= $2
       ORDER BY logged_at ASC`,
      [userId, since.toISOString()]
    ),
    query(
      `SELECT amount_ml, logged_at FROM water_logs
       WHERE user_id = $1 AND deleted_at IS NULL AND logged_at >= $2
       ORDER BY logged_at ASC`,
      [userId, since.toISOString()]
    ),
    query(
      `SELECT meal_type, calories, logged_at FROM food_logs
       WHERE user_id = $1 AND deleted_at IS NULL AND logged_at >= $2
       ORDER BY logged_at ASC`,
      [userId, since.toISOString()]
    ),
    query(
      `SELECT activity_type, duration_minutes, liked, logged_at FROM fitness_logs
       WHERE user_id = $1 AND deleted_at IS NULL AND logged_at >= $2
       ORDER BY logged_at ASC`,
      [userId, since.toISOString()]
    ),
    query(
      `SELECT start_date, end_date, flow_level FROM periods
       WHERE user_id = $1 AND deleted_at IS NULL
       ORDER BY start_date DESC LIMIT 12`,
      [userId]
    ),
  ]);

  const waterByDay: Record<string, number> = {};
  for (const w of water as { amount_ml: number; logged_at: string }[]) {
    const day = w.logged_at.split('T')[0];
    waterByDay[day] = (waterByDay[day] || 0) + w.amount_ml;
  }

  const fitnessByType: Record<string, { total: number; liked: number }> = {};
  for (const f of fitness as { activity_type: string; duration_minutes: number; liked: boolean }[]) {
    if (!fitnessByType[f.activity_type]) {
      fitnessByType[f.activity_type] = { total: 0, liked: 0 };
    }
    fitnessByType[f.activity_type].total += f.duration_minutes;
    if (f.liked) fitnessByType[f.activity_type].liked++;
  }

  res.json({
    weight,
    waterDaily: Object.entries(waterByDay).map(([date, total_ml]) => ({ date, total_ml })),
    food,
    fitness,
    fitnessByType,
    periods,
  });
});

export default router;
