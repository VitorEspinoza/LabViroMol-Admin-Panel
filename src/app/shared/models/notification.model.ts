export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  referenceId: string | null;
  referenceModule: string | null;
  createdAt: string;
}
