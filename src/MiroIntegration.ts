import axios from 'axios';

interface MiroBoard {
  id: string;
  name: string;
  createdAt: string;
  modifiedAt: string;
  viewLink: string;
}

interface MiroStickyNote {
  id: string;
  type: 'sticky_note';
  data: {
    content: string;
    shape: 'square' | 'rectangle';
  };
  style: {
    fillColor: string;
  };
  position: {
    x: number;
    y: number;
  };
}

interface MiroTextFrame {
  id: string;
  type: 'text';
  data: {
    content: string;
  };
  position: {
    x: number;
    y: number;
  };
  geometry: {
    width: number;
    height: number;
  };
}

interface LearningHourMiroLayout {
  boardId: string;
  sections: {
    overview: MiroTextFrame;
    objectives: MiroStickyNote[];
    activities: MiroStickyNote[];
    discussions: MiroStickyNote[];
    takeaways: MiroStickyNote[];
  };
}

export class MiroIntegration {
  private readonly miroApiUrl = 'https://api.miro.com/v2';
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  static async createFromOAuth(clientId: string, clientSecret: string, code: string, redirectUri: string): Promise<MiroIntegration> {
    try {
      const response = await axios.post('https://api.miro.com/v1/oauth/token', null, {
        params: {
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          redirect_uri: redirectUri
        },
        headers: {
          'content-type': 'application/x-www-form-urlencoded'
        }
      });

      return new MiroIntegration(response.data.access_token);
    } catch (error) {
      throw new Error(`Failed to exchange OAuth code for token: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static getAuthorizationUrl(clientId: string, redirectUri: string, state?: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'boards:read boards:write'
    });

    if (state) {
      params.set('state', state);
    }

    return `https://miro.com/oauth/authorize?${params.toString()}`;
  }

  async createBoard(name: string, description?: string): Promise<MiroBoard> {
    try {
      const response = await axios.post(`${this.miroApiUrl}/boards`, {
        name,
        description,
        policy: {
          permissionsPolicy: {
            collaborationToolsStartAccess: 'all_editors',
            copyAccess: 'anyone',
            sharingAccess: 'team_members_with_editing_rights'
          }
        }
      }, {
        headers: {
          'authorization': `Bearer ${this.accessToken}`,
          'content-type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to create Miro board: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async createStickyNote(boardId: string, content: string, x: number, y: number, color: string = 'light_yellow'): Promise<MiroStickyNote> {
    try {
      const response = await axios.post(`${this.miroApiUrl}/boards/${boardId}/items`, {
        type: 'sticky_note',
        data: {
          content: content,
          shape: 'square'
        },
        style: {
          fillColor: color
        },
        position: {
          x: x,
          y: y
        }
      }, {
        headers: {
          'authorization': `Bearer ${this.accessToken}`,
          'content-type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to create sticky note: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async createTextFrame(boardId: string, content: string, x: number, y: number, width: number = 400, height: number = 200): Promise<MiroTextFrame> {
    try {
      const response = await axios.post(`${this.miroApiUrl}/boards/${boardId}/items`, {
        type: 'text',
        data: {
          content: content
        },
        style: {
          fillColor: 'transparent',
          fontSize: '14',
          textAlign: 'left'
        },
        position: {
          x: x,
          y: y
        },
        geometry: {
          width: width,
          height: height
        }
      }, {
        headers: {
          'authorization': `Bearer ${this.accessToken}`,
          'content-type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to create text frame: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async createLearningHourBoard(sessionContent: any): Promise<LearningHourMiroLayout> {
    const boardName = sessionContent.miroContent.boardTitle;
    const board = await this.createBoard(boardName, sessionContent.sessionOverview);

    const layout: LearningHourMiroLayout = {
      boardId: board.id,
      sections: {
        overview: {} as MiroTextFrame,
        objectives: [],
        activities: [],
        discussions: [],
        takeaways: []
      }
    };

    let currentY = -400;
    const sectionSpacing = 300;
    const itemSpacing = 120;

    for (const section of sessionContent.miroContent.sections) {
      const sectionY = currentY;
      currentY += sectionSpacing;

      if (section.type === 'text_frame') {
        const textFrame = await this.createTextFrame(
          board.id,
          `<h2>${section.title}</h2><p>${section.content}</p>`,
          -200,
          sectionY,
          600,
          150
        );
        
        if (section.title === 'Session Overview') {
          layout.sections.overview = textFrame;
        }
      } else if (section.type === 'sticky_notes' && section.items) {
        const stickyNotes: MiroStickyNote[] = [];
        let currentX = -400;

        for (const item of section.items) {
          const note = await this.createStickyNote(
            board.id,
            item,
            currentX,
            sectionY,
            section.color || 'light_yellow'
          );
          stickyNotes.push(note);
          currentX += itemSpacing;
        }

        switch (section.title) {
          case 'Learning Objectives':
            layout.sections.objectives = stickyNotes;
            break;
          case 'Activities':
            layout.sections.activities = stickyNotes;
            break;
          case 'Discussion Questions':
            layout.sections.discussions = stickyNotes;
            break;
          case 'Key Takeaways':
            layout.sections.takeaways = stickyNotes;
            break;
        }
      }

      await this.createTextFrame(
        board.id,
        `<h3>${section.title}</h3>`,
        -500,
        sectionY,
        200,
        60
      );
    }

    return layout;
  }

  async getBoardViewLink(boardId: string): Promise<string> {
    try {
      const response = await axios.get(`${this.miroApiUrl}/boards/${boardId}`, {
        headers: {
          'authorization': `Bearer ${this.accessToken}`
        }
      });

      return response.data.viewLink;
    } catch (error) {
      throw new Error(`Failed to get board view link: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async validateToken(): Promise<boolean> {
    try {
      await axios.get(`${this.miroApiUrl}/boards`, {
        headers: {
          'authorization': `Bearer ${this.accessToken}`
        }
      });
      return true;
    } catch (error) {
      return false;
    }
  }
}