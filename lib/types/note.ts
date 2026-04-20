export type NoteLine = {
  text: string;
  checked: boolean;
};

export type NotePayload = {
  title: string;
  lines: NoteLine[];
};

export type NoteListItem = {
  id: string;
  title: string;
  preview: string;
  updatedAt: number;
};
