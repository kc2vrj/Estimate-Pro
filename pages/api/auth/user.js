export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Check if user is authenticated
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  // Return user data without sensitive information
  const user = {
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    is_approved: req.user.is_approved,
    created_at: req.user.created_at
  };

  res.status(200).json({ user });
}
