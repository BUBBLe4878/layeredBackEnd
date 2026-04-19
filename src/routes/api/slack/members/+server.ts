import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  try {
    console.log('Slack members endpoint hit');
    
    const allUsers = await db.select({
      id: user.id,
      name: user.name,
      slackId: user.slackId,
      createdAt: user.createdAt,
    }).from(user);

    const slackMembers = allUsers.filter(u => u.slackId && u.slackId.trim());

    // Fetch Slack profile info for each user to get their real profile picture
    const membersWithSlackProfiles = await Promise.all(
      slackMembers.map(async (member) => {
        try {
          const slackResponse = await fetch('https://slack.com/api/users.info', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `user=${member.slackId}`,
          });

          const slackData = await slackResponse.json();

          // Get the best available profile picture
          let profileImage = null;
          if (slackData.user?.profile) {
            profileImage = slackData.user.profile.image_512 ||
                          slackData.user.profile.image_256 ||
                          slackData.user.profile.image_192 ||
                          slackData.user.profile.image_72;
          }

          return {
            id: member.id,
            name: member.name || 'Unknown',
            slackId: member.slackId,
            profileImage: profileImage, // Real Slack profile pic
            signedUpAt: member.createdAt,
          };
        } catch (err) {
          console.error(`Error fetching Slack profile for ${member.slackId}:`, err);
          // Fallback to no image if Slack API fails
          return {
            id: member.id,
            name: member.name || 'Unknown',
            slackId: member.slackId,
            profileImage: null,
            signedUpAt: member.createdAt,
          };
        }
      })
    );

    console.log('Found', slackMembers.length, 'members');

    return json({
      success: true,
      count: slackMembers.length,
      members: membersWithSlackProfiles,
    });
  } catch (error) {
    console.error('Error fetching members:', error);
    return json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};
