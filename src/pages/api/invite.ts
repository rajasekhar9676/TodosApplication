import { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';


const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, teamId, role, inviterName } = req.body;

  if (!email || !teamId) {
    return res.status(400).json({ error: 'Missing email or teamId' });
  }

  try {
    const teamName = `Team #${teamId}`; // Temporary placeholder

    await resend.emails.send({
      from: 'Your App <no-reply@yourapp.com>',
      to: email,
      subject: `Invitation to join ${teamName}`,
      html: `
        <p>Hi there,</p>
        <p>${inviterName || 'Someone'} has invited you to join the team <strong>${teamName}</strong> on OurTodoApp.</p>
        <p><a href="https://yourapp.com/invite/accept?teamId=${teamId}&email=${encodeURIComponent(email)}">Click here to accept the invitation</a></p>
        <p>Thanks,<br/>The OurTodoApp Team</p>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Email sending error:', error);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}
