// src/app/services/ui-state.service.ts

import { Injectable } from '@angular/core';

export interface UiState {
  lastSelectedPatientId: number | null;
  patientSearchQuery: string;
  patientInfoCollapsed: boolean;  // для мобильной версии
}

const STORAGE_KEY = 'app_ui_state';

@Injectable({ providedIn: 'root' })
export class UiStateService {
  private state: UiState = {
    lastSelectedPatientId: null,
    patientSearchQuery: '',
    patientInfoCollapsed: false,
  };

  constructor() {
    this.load();
  }

  private load(): void {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        this.state = { ...this.state, ...JSON.parse(saved) };
      } catch (e) {
        console.warn('Failed to load UI state', e);
      }
    }
  }

  private save(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }

  getLastSelectedPatientId(): number | null {
    return this.state.lastSelectedPatientId;
  }

  setLastSelectedPatientId(id: number | null): void {
    this.state.lastSelectedPatientId = id;
    this.save();
  }

  getPatientSearchQuery(): string {
    return this.state.patientSearchQuery;
  }

  setPatientSearchQuery(query: string): void {
    this.state.patientSearchQuery = query;
    this.save();
  }

  getPatientInfoCollapsed(): boolean {
    return this.state.patientInfoCollapsed;
  }

  setPatientInfoCollapsed(collapsed: boolean): void {
    this.state.patientInfoCollapsed = collapsed;
    this.save();
  }

  // Сброс всех настроек (при выходе из системы, если нужно)
  clear(): void {
    this.state = {
      lastSelectedPatientId: null,
      patientSearchQuery: '',
      patientInfoCollapsed: false,
    };
    this.save();
  }
}