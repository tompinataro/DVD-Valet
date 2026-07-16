import { Alert } from 'react-native';

const BACKUP_REMINDER =
  'Be sure to back up your phone to protect the newly scanned DVDs added to your library. Use the app switcher when you are ready to close DVD Valet.';

export function confirmExitWithBackupReminder() {
  Alert.alert(
    'Backup Reminder',
    BACKUP_REMINDER,
    [{ text: 'Got it', style: 'default' }],
    { cancelable: true }
  );
}
