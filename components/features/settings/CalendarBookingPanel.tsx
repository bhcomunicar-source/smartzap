'use client';

import React, { useState } from 'react';
import { Calendar, Edit2, ChevronDown, ChevronUp, Check } from 'lucide-react';
import {
  useCalendarBooking,
  type UseCalendarBookingProps,
  CALENDAR_WEEK_LABELS,
} from '../../../hooks/settings/useCalendarBooking';
import {
  BookingConfigSection,
  CalendarStatusSection,
  CalendarWizardModal,
} from './calendar';

export interface CalendarBookingPanelProps extends UseCalendarBookingProps {
  // Additional props can be added here if needed
}

export function CalendarBookingPanel({
  isConnected,
  calendarBooking,
  calendarBookingLoading,
  saveCalendarBooking,
  isSavingCalendarBooking,
}: CalendarBookingPanelProps) {
  const hook = useCalendarBooking({
    isConnected,
    calendarBooking,
    calendarBookingLoading,
    saveCalendarBooking,
    isSavingCalendarBooking,
  });

  // Colapsado por padrão quando conectado
  const [isExpanded, setIsExpanded] = useState(false);
  const isConfigured = hook.calendarAuthStatus?.connected && hook.calendarAuthStatus?.calendar?.calendarId;

  // Resumo dos dias habilitados
  const enabledDays = hook.calendarDraft.workingHours.filter(d => d.enabled);
  const enabledDayLabels = enabledDays.map(d => CALENDAR_WEEK_LABELS[d.day]?.slice(0, 3)).join(', ');

  return (
    <div className="glass-panel rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <Calendar size={20} className="text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Agendamento (Google Calendar)</h3>
            <p className="text-sm text-gray-500">
              {isConfigured ? 'Conectado e configurado' : 'Configure para habilitar agendamentos'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isConfigured && (
            <span className="text-xs text-emerald-400 flex items-center gap-1 mr-2">
              <Check size={12} /> Ativo
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setIsExpanded(true);
              hook.setIsEditingCalendarBooking(true);
            }}
            className="h-9 px-4 rounded-lg bg-white/5 text-white hover:bg-white/10 border border-white/10 text-sm font-medium inline-flex items-center gap-2"
          >
            <Edit2 size={14} /> Editar
          </button>
        </div>
      </div>

      {/* Resumo compacto quando conectado */}
      {isConfigured && !isExpanded && (
        <div className="mt-4 flex items-center justify-between p-4 rounded-xl bg-zinc-900/50 border border-white/10">
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-gray-500">Calendario:</span>{' '}
              <span className="text-white">{hook.calendarAuthStatus?.calendar?.calendarSummary}</span>
            </div>
            <div>
              <span className="text-gray-500">Slots:</span>{' '}
              <span className="text-white">{hook.calendarDraft.slotDurationMinutes}min</span>
            </div>
            <div>
              <span className="text-gray-500">Dias:</span>{' '}
              <span className="text-white">{enabledDayLabels || 'Nenhum'}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            Expandir <ChevronDown size={16} />
          </button>
        </div>
      )}

      {/* Conteúdo expandido */}
      {(!isConfigured || isExpanded) && (
        <>
          {/* Calendar Status Section */}
          <CalendarStatusSection
            calendarAuthLoading={hook.calendarAuthLoading}
            calendarAuthStatus={hook.calendarAuthStatus}
            calendarTestLoading={hook.calendarTestLoading}
            calendarTestResult={hook.calendarTestResult}
            handlePrimaryCalendarAction={hook.handlePrimaryCalendarAction}
            handleCalendarTestEvent={hook.handleCalendarTestEvent}
            setCalendarWizardStep={hook.setCalendarWizardStep}
            setCalendarWizardError={hook.setCalendarWizardError}
            setIsCalendarWizardOpen={hook.setIsCalendarWizardOpen}
          />

          {/* Booking Configuration Section */}
          <BookingConfigSection
            calendarBookingLoading={calendarBookingLoading}
            calendarBooking={calendarBooking}
            isEditingCalendarBooking={hook.isEditingCalendarBooking}
            setIsEditingCalendarBooking={hook.setIsEditingCalendarBooking}
            calendarDraft={hook.calendarDraft}
            updateCalendarDraft={hook.updateCalendarDraft}
            updateWorkingHours={hook.updateWorkingHours}
            handleSaveCalendarBooking={hook.handleSaveCalendarBooking}
            isSavingCalendarBooking={isSavingCalendarBooking}
          />

          {/* Botão de colapsar */}
          {isConfigured && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="text-sm text-gray-500 hover:text-white flex items-center gap-1"
              >
                <ChevronUp size={16} /> Recolher
              </button>
            </div>
          )}
        </>
      )}

      {/* Calendar Wizard Modal */}
      <CalendarWizardModal
        isCalendarWizardOpen={hook.isCalendarWizardOpen}
        setIsCalendarWizardOpen={hook.setIsCalendarWizardOpen}
        calendarWizardStep={hook.calendarWizardStep}
        calendarWizardError={hook.calendarWizardError}
        calendarWizardCanContinue={hook.calendarWizardCanContinue}
        calendarTestLoading={hook.calendarTestLoading}
        calendarCredsError={hook.calendarCredsError}
        calendarAuthError={hook.calendarAuthError}
        calendarListError={hook.calendarListError}
        calendarCredsStatus={hook.calendarCredsStatus}
        calendarAuthStatus={hook.calendarAuthStatus}
        handleCalendarWizardStepClick={hook.handleCalendarWizardStepClick}
        handleCalendarWizardBack={hook.handleCalendarWizardBack}
        handleCalendarWizardNext={hook.handleCalendarWizardNext}
        calendarCredsLoading={hook.calendarCredsLoading}
        calendarCredsSaving={hook.calendarCredsSaving}
        calendarClientIdDraft={hook.calendarClientIdDraft}
        calendarClientSecretDraft={hook.calendarClientSecretDraft}
        calendarBaseUrl={hook.calendarBaseUrl}
        calendarBaseUrlDraft={hook.calendarBaseUrlDraft}
        calendarBaseUrlEditing={hook.calendarBaseUrlEditing}
        calendarRedirectUrl={hook.calendarRedirectUrl}
        calendarClientIdValid={hook.calendarClientIdValid}
        calendarClientSecretValid={hook.calendarClientSecretValid}
        calendarCredsFormValid={hook.calendarCredsFormValid}
        calendarCredsSourceLabel={hook.calendarCredsSourceLabel}
        setCalendarClientIdDraft={hook.setCalendarClientIdDraft}
        setCalendarClientSecretDraft={hook.setCalendarClientSecretDraft}
        setCalendarBaseUrlDraft={hook.setCalendarBaseUrlDraft}
        setCalendarBaseUrlEditing={hook.setCalendarBaseUrlEditing}
        handleSaveCalendarCreds={hook.handleSaveCalendarCreds}
        handleRemoveCalendarCreds={hook.handleRemoveCalendarCreds}
        handleCopyCalendarValue={hook.handleCopyCalendarValue}
        calendarConnectLoading={hook.calendarConnectLoading}
        handleConnectCalendar={hook.handleConnectCalendar}
        handleDisconnectCalendar={hook.handleDisconnectCalendar}
        fetchCalendarAuthStatus={hook.fetchCalendarAuthStatus}
        calendarList={hook.calendarList}
        calendarListLoading={hook.calendarListLoading}
        calendarSelectionId={hook.calendarSelectionId}
        calendarSelectionSaving={hook.calendarSelectionSaving}
        calendarListQuery={hook.calendarListQuery}
        filteredCalendarList={hook.filteredCalendarList}
        selectedCalendarTimeZone={hook.selectedCalendarTimeZone}
        setCalendarSelectionId={hook.setCalendarSelectionId}
        setCalendarListQuery={hook.setCalendarListQuery}
        fetchCalendarList={hook.fetchCalendarList}
        handleSaveCalendarSelection={hook.handleSaveCalendarSelection}
      />
    </div>
  );
}
