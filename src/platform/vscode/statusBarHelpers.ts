/**
 * VS Code Status Bar Helper Functions
 *
 * Helper functions for wrapping VS Code status bar APIs to match PlatformAdapter interface
 */

import * as vscode from 'vscode';
import type { StatusBarItem, StatusBarAlignment } from '../PlatformAdapter.js';

/**
 * Wrap a VS Code status bar item to match PlatformAdapter interface
 */
export function wrapStatusBarItem(item: vscode.StatusBarItem): StatusBarItem {
  return {
    get id() {
      return item.id;
    },
    get alignment() {
      return item.alignment as StatusBarAlignment;
    },
    set alignment(value: StatusBarAlignment) {
      item.alignment = value as vscode.StatusBarAlignment;
    },
    get priority() {
      return item.priority;
    },
    set priority(value: number) {
      item.priority = value;
    },
    get text() {
      return item.text;
    },
    set text(value: string) {
      item.text = value;
    },
    get tooltip() {
      return item.tooltip;
    },
    set tooltip(value: string | undefined) {
      item.tooltip = value;
    },
    get color() {
      return item.color;
    },
    set color(value: string | undefined) {
      item.color = value;
    },
    get backgroundColor() {
      return item.backgroundColor;
    },
    set backgroundColor(value: string | undefined) {
      item.backgroundColor = value;
    },
    get command() {
      return item.command;
    },
    set command(value: string | undefined) {
      item.command = value;
    },
    get accessibilityInformation() {
      return item.accessibilityInformation;
    },
    set accessibilityInformation(value: { label: string; role: string } | undefined) {
      item.accessibilityInformation = value;
    },
    show: () => item.show(),
    hide: () => item.hide(),
    dispose: () => item.dispose(),
  };
}
