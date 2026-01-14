'use client';

import React from 'react';
import { Calendar, Edit2 } from 'lucide-react';
import {
  useCalendarBooking,
  type UseCalendarBookingProps,
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

  return (
    <div className="glass-panel rounded-2xl p-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <span className="w-1 h-6 bg-emerald-500 rounded-full"></span>
            <Calendar size={18} className="text-emerald-300" />
            Agendamento (Google Calendar)
          </h3>
          <p className="text-sm text-gray-400">
            Define as regras padrao para gerar slots e validar reservas no Google Calendar.
          </p>
        </div>

        <button
          type="button"
          onClick={() => hook.setIsEditingCalendarBooking(!hook.isEditingCalendarBooking)}
          className="h-10 px-4 rounded-lg bg-white/5 text-white hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-sm font-medium inline-flex items-center gap-2 whitespace-nowrap"
        >
          <Edit2 size={14} /> {hook.isEditingCalendarBooking ? 'Cancelar' : 'Editar regras'}
        </button>
      </div>

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
    </div>
  );
}
