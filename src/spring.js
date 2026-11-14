// Critically damped spring with a speed cap. Frame-rate independent.
export function smoothDamp(cur, target, vel, smoothTime, maxSpeed, dt) {
  const omega = 2 / smoothTime, x = omega * dt, exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const maxChange = maxSpeed * smoothTime;
  const change = Math.min(maxChange, Math.max(-maxChange, cur - target));
  const goal = cur - change, temp = (vel + omega * change) * dt;
  let v = (vel - omega * temp) * exp, out = goal + (change + temp) * exp;
  if (target - cur > 0 === out > target) { out = target; v = 0; }
  return [out, v];
}
