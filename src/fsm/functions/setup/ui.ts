import * as vscode from 'vscode';

export type SetupAction =
  | 'add'
  | 'manage'
  | 'switch'
  | 'entraSignIn'
  | 'entraSignOut'
  | 'convertToEntra';

export async function showSetupMenu(): Promise<SetupAction | undefined> {
  const action = await vscode.window.showQuickPick(
    [
      { label: 'Add new connection', action: 'add' as SetupAction },
      { label: 'Manage existing connections', action: 'manage' as SetupAction },
      { label: 'Switch active connection', action: 'switch' as SetupAction },
      {
        label: '$(sign-in) Sign in with Microsoft Entra ID',
        action: 'entraSignIn' as SetupAction,
      },
      {
        label: '$(sign-out) Sign out from Microsoft Entra ID',
        action: 'entraSignOut' as SetupAction,
      },
      {
        label: 'Convert PAT connection to Entra ID',
        action: 'convertToEntra' as SetupAction,
      },
    ],
    { placeHolder: 'What would you like to do?' }
  );

  return action?.action;
}
