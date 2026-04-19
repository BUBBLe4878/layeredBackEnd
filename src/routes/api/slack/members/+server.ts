import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  try {
    console.log('🔍 Slack members endpoint hit');
    
    const allUsers = await db.select({
      id: user.id,
      slackId: user.slackId,
      name: user.name,
      profilePicture: user.profilePicture,
      createdAt: user.createdAt,
    }).from(user);

    const slackMembers = allUsers.filter(u => u.slackId && u.slackId.trim());

    console.log('✅ Found', slackMembers.length, 'members');

    return json({
      success: true,
      count: slackMembers.length,
      members: slackMembers.map(u => ({
        id: u.id,
        name: u.name,
        slackId: u.slackId,
        profileImage: u.profilePicture,
        signedUpAt: u.createdAt,
      })),
    });
  } catch (error) {
    console.error('❌ Error fetching members:', error);
    return json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};
