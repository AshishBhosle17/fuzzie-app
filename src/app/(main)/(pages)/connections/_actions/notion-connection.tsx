'use server';

import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs';
import { Client } from '@notionhq/client';

// Helper function to validate UUID
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return uuidRegex.test(uuid);
}

export const onNotionConnect = async (
  access_token: string,
  workspace_id: string,
  workspace_icon: string,
  workspace_name: string,
  database_id: string,
  id: string
) => {
  'use server';
  if (access_token) {
    // Check if Notion is connected
    const notion_connected = await db.notion.findFirst({
      where: { accessToken: access_token },
      include: {
        connections: {
          select: { type: true },
        },
      },
    });

    if (!notion_connected) {
      // Create connection
      await db.notion.create({
        data: {
          userId: id,
          workspaceIcon: workspace_icon!,
          accessToken: access_token,
          workspaceId: workspace_id!,
          workspaceName: workspace_name!,
          databaseId: database_id,
          connections: {
            create: {
              userId: id,
              type: 'Notion',
            },
          },
        },
      });
    }
  }
};

export const getNotionConnection = async () => {
  const user = await currentUser();
  if (user) {
    const connection = await db.notion.findFirst({
      where: { userId: user.id },
    });
    return connection || null;
  }
  return null;
};

export const getNotionDatabase = async (databaseId: string, accessToken: string) => {
  if (!isValidUUID(databaseId)) {
    throw new Error('Invalid database ID');
  }
  
  const notion = new Client({ auth: accessToken });
  const response = await notion.databases.retrieve({ database_id: databaseId });
  return response;
};

export const onCreateNewPageInDatabase = async (
  databaseId: string,
  accessToken: string,
  content: string
) => {
  if (!isValidUUID(databaseId)) {
    console.error('Invalid database ID:', databaseId);
    throw new Error('Invalid database ID');
  }

  const notion = new Client({ auth: accessToken });

  console.log('Database ID:', databaseId);

  try {
    const response = await notion.pages.create({
      parent: {
        type: 'database_id',
        database_id: databaseId,
      },
      properties: {
        title: {
          title: [
            {
              text: { content },
            },
          ],
        },
      },
    });
    return response;
  } catch (error) {
    console.error('Error creating Notion page:', error);
    throw error;
  }
};
