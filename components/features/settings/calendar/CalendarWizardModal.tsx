'use client';

import React from 'react';
import { X } from 'lucide-react';
import type { CalendarWizardModalProps } from './types';
import { WizardSidebar } from './WizardSidebar';
import { WizardStepChecklist } from './WizardStepChecklist';
import { WizardStepCredentials } from './WizardStepCredentials';
import { WizardStepConnect } from './WizardStepConnect';
import { WizardStepCalendarSelection } from './WizardStepCalendarSelection';

export function CalendarWizardModal({
  isCalendarWizardOpen,
  setIsCalendarWizardOpen,
  calendarWizardStep,
  calendarWizardError,
  calendarWizardCanContinue,
  calendarTestLoading,

  // Step errors
  calendarCredsError,
  calendarAuthError,
  calendarListError,

  // Sidebar props
  calendarCredsStatus,
  calendarAuthStatus,
  handleCalendarWizardStepClick,

  // Navigation
  handleCalendarWizardBack,
  handleCalendarWizardNext,

  // Step 1 props
  calendarCredsLoading,
  calendarCredsSaving,
  calendarClientIdDraft,
  calendarClientSecretDraft,
  calendarBaseUrl,
  calendarBaseUrlDraft,
  calendarBaseUrlEditing,
  calendarRedirectUrl,
  calendarClientIdValid,
  calendarClientSecretValid,
  calendarCredsFormValid,
  calendarCredsSourceLabel,
  setCalendarClientIdDraft,
  setCalendarClientSecretDraft,
  setCalendarBaseUrlDraft,
  setCalendarBaseUrlEditing,
  handleSaveCalendarCreds,
  handleRemoveCalendarCreds,
  handleCopyCalendarValue,

  // Step 2 props
  calendarConnectLoading,
  handleConnectCalendar,
  handleDisconnectCalendar,
  fetchCalendarAuthStatus,

  // Step 3 props
  calendarList,
  calendarListLoading,
  calendarSelectionId,
  calendarSelectionSaving,
  calendarListQuery,
  filteredCalendarList,
  selectedCalendarTimeZone,
  setCalendarSelectionId,
  setCalendarListQuery,
  fetchCalendarList,
  handleSaveCalendarSelection,
}: CalendarWizardModalProps) {
  if (!isCalendarWizardOpen) return null;

  const currentError = calendarWizardError
    || (calendarWizardStep === 1 && calendarCredsError)
    || (calendarWizardStep === 2 && calendarAuthError)
    || (calendarWizardStep === 3 && calendarListError);

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 text-white">
      <div className="flex h-full flex-col lg:flex-row">
        <WizardSidebar
          calendarWizardStep={calendarWizardStep}
          calendarCredsStatus={calendarCredsStatus}
          calendarAuthStatus={calendarAuthStatus}
          handleCalendarWizardStepClick={handleCalendarWizardStepClick}
        />

        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xl font-semibold text-white">Conectar Google Calendar</div>
              <div className="mt-1 text-sm text-gray-400">
                Voce so faz isso uma vez. Depois o agendamento roda sozinho.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCalendarWizardOpen(false)}
                className="h-9 px-4 rounded-lg border border-white/10 bg-white/5 text-xs text-white hover:bg-white/10 transition-colors"
              >
                Salvar e sair
              </button>
              <button
                type="button"
                onClick={() => setIsCalendarWizardOpen(false)}
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="mt-6 max-w-3xl space-y-5">
            {currentError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-100">
                {currentError}
              </div>
            )}

            {calendarWizardStep === 0 && <WizardStepChecklist />}

            {calendarWizardStep === 1 && (
              <WizardStepCredentials
                calendarCredsStatus={calendarCredsStatus}
                calendarAuthStatus={calendarAuthStatus}
                calendarCredsLoading={calendarCredsLoading}
                calendarCredsSaving={calendarCredsSaving}
                calendarClientIdDraft={calendarClientIdDraft}
                calendarClientSecretDraft={calendarClientSecretDraft}
                calendarBaseUrl={calendarBaseUrl}
                calendarBaseUrlDraft={calendarBaseUrlDraft}
                calendarBaseUrlEditing={calendarBaseUrlEditing}
                calendarRedirectUrl={calendarRedirectUrl}
                calendarClientIdValid={calendarClientIdValid}
                calendarClientSecretValid={calendarClientSecretValid}
                calendarCredsFormValid={calendarCredsFormValid}
                calendarCredsSourceLabel={calendarCredsSourceLabel}
                setCalendarClientIdDraft={setCalendarClientIdDraft}
                setCalendarClientSecretDraft={setCalendarClientSecretDraft}
                setCalendarBaseUrlDraft={setCalendarBaseUrlDraft}
                setCalendarBaseUrlEditing={setCalendarBaseUrlEditing}
                handleSaveCalendarCreds={handleSaveCalendarCreds}
                handleRemoveCalendarCreds={handleRemoveCalendarCreds}
                handleCopyCalendarValue={handleCopyCalendarValue}
              />
            )}

            {calendarWizardStep === 2 && (
              <WizardStepConnect
                calendarCredsStatus={calendarCredsStatus}
                calendarAuthStatus={calendarAuthStatus}
                calendarConnectLoading={calendarConnectLoading}
                handleConnectCalendar={handleConnectCalendar}
                handleDisconnectCalendar={handleDisconnectCalendar}
                fetchCalendarAuthStatus={fetchCalendarAuthStatus}
              />
            )}

            {calendarWizardStep === 3 && (
              <WizardStepCalendarSelection
                calendarCredsStatus={calendarCredsStatus}
                calendarAuthStatus={calendarAuthStatus}
                calendarList={calendarList}
                calendarListLoading={calendarListLoading}
                calendarListError={calendarListError}
                calendarSelectionId={calendarSelectionId}
                calendarSelectionSaving={calendarSelectionSaving}
                calendarListQuery={calendarListQuery}
                filteredCalendarList={filteredCalendarList}
                selectedCalendarTimeZone={selectedCalendarTimeZone}
                setCalendarSelectionId={setCalendarSelectionId}
                setCalendarListQuery={setCalendarListQuery}
                fetchCalendarList={fetchCalendarList}
                handleSaveCalendarSelection={handleSaveCalendarSelection}
              />
            )}

            {/* Wizard Navigation */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleCalendarWizardBack}
                className="h-9 px-4 rounded-lg border border-white/10 bg-white/5 text-xs text-white hover:bg-white/10 transition-colors"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleCalendarWizardNext}
                disabled={!calendarWizardCanContinue || calendarTestLoading}
                className="h-9 px-4 rounded-lg bg-emerald-500/90 text-white text-xs font-medium hover:bg-emerald-500 transition-colors disabled:opacity-40"
              >
                {calendarWizardStep === 3
                  ? (calendarTestLoading ? 'Testando...' : 'Concluir e testar')
                  : 'Continuar'}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
