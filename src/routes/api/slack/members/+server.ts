import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  try {
    // Fetch all signed-up users
    const allUsers = await db.select({
      id: user.id,
      name: user.name,
      slackId: user.slackId,
      profilePicture: user.profilePicture, // FIX: was profileImage
      createdAt: user.createdAt,
    }).from(user);

    // Filter to only users who have a valid slackId
    const slackMembers = allUsers.filter(u => u.slackId && u.slackId.trim());

    return json({
      success: true,
      count: slackMembers.length,
      members: slackMembers.map(u => ({
        id: u.id,
        name: u.name || 'Unknown',
        slackId: u.slackId,
        profileImage: u.profilePicture, // Return as profileImage for bot
        signedUpAt: u.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching members:', error);
    return json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};
