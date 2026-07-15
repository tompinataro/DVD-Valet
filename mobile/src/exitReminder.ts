import { Alert, BackHandler } from 'react-native';

const BACKUP_REMINDER =
  'Be sure to back up your phone to protect the newly scanned DVDs added to your library.';

export function confirmExitWithBackupReminder() {
  Alert.alert(
    'Backup Reminder',
    BACKUP_REMINDER,
    [
      { text: 'Stay', style: 'cancel' },
      {
        text: 'Exit',
        style: 'destructive',
        onPress: () => BackHandler.exitApp(),
      },
    ],
    { cancelable: true }
  );
}
