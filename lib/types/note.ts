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
  /** 行の本数（一覧で単独行のみチェック操作を出すため） */
  lineCount: number;
  /** 行がちょうど1つのときのみ。一覧のチェック切り替えに使う */
  onlyLine?: NoteLine;
};
