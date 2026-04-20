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
  /** 本文の冒頭（行をつないだ抜粋・検索用。タイトルとは別） */
  preview: string;
  updatedAt: number;
  /** 未チェックの行が1行でもある */
  hasUncheckedLines: boolean;
  /** チェック済みの行が1行でもある */
  hasCheckedLines: boolean;
};
