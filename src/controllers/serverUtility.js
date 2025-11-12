export function healthCheck(req, res) {
  res.status(200).json({ ok: true, message: "Service is healthy" });
}
