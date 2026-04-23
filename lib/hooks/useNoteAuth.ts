/**
 * 認証・ローカル→クラウド移行の状態。アプリ全体で1つの NoteAuthProvider から供給される。
 */
export { useNoteAuth, type NoteAuthState } from "@/lib/contexts/NoteAuthContext";
