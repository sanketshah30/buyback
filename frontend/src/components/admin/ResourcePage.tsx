import { useCallback, useEffect, useState } from 'react';
import { getAdminErrorMessage } from '../../lib/adminErrors';
import { Banner } from '../ui/Banner';
import { Button } from '../ui/Button';
import { DataTable, type Column } from './DataTable';
import { FormFields, type FieldDef, type FieldValue, type FormValues } from './FormFields';
import { ResourceDrawer } from './ResourceDrawer';
import './ResourcePage.css';

interface Row {
  id: number;
  isActive: boolean;
}

interface ResourcePageProps<T extends Row> {
  title: string;
  description?: string;
  /** Singular, lowercase - used in button labels and messages, e.g. "category". */
  entityName: string;
  columns: Column<T>[];
  load: () => Promise<T[]>;
  /** Receives the record being edited (null when creating) so select options can include its current, possibly inactive, parents. */
  fields: (editing: T | null) => FieldDef[];
  emptyValues: FormValues;
  toFormValues: (row: T) => FormValues;
  onCreate: (values: FormValues) => Promise<unknown>;
  /** The row's id goes in the JSON body only - callers pass `row.id` to the adminApi wrapper. */
  onUpdate: (row: T, values: FormValues) => Promise<unknown>;
  onSetActive: (row: T, isActive: boolean) => Promise<unknown>;
  /** Extra checks beyond "required" - return { fieldKey: message }. */
  validate?: (values: FormValues, mode: 'create' | 'edit') => Record<string, string>;
  /** Errors from lookup loads (selects) owned by the page. */
  extraError?: string | null;
  /** Disable "Create" until lookups needed by the form are ready. */
  createDisabled?: boolean;
  /** Bump to force a reload (e.g. after lookups change). */
  reloadKey?: number;
}

export function ResourcePage<T extends Row>({
  title,
  description,
  entityName,
  columns,
  load,
  fields,
  emptyValues,
  toFormValues,
  onCreate,
  onUpdate,
  onSetActive,
  validate,
  extraError,
  createDisabled = false,
  reloadKey = 0,
}: ResourcePageProps<T>) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Drawer state - the id of the record being edited lives here, never in the URL.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [values, setValues] = useState<FormValues>(emptyValues);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const fieldDefs = fields(editing);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await load());
      setPageError(null);
    } catch (err) {
      setPageError(getAdminErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [load]);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on mount / explicit key only; `load` is usually an inline closure
  useEffect(() => void refresh(), [reloadKey]);

  const openCreate = () => {
    setEditing(null);
    setValues(emptyValues);
    setFieldErrors({});
    setFormError(null);
    setNotice(null);
    setDrawerOpen(true);
  };

  const openEdit = (row: T) => {
    setEditing(row);
    setValues(toFormValues(row));
    setFieldErrors({});
    setFormError(null);
    setNotice(null);
    setDrawerOpen(true);
  };

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const handleChange = (key: string, value: FieldValue) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async () => {
    const mode = editing ? 'edit' : 'create';
    const errors: Record<string, string> = {};
    for (const field of fieldDefs) {
      if (field.mode && field.mode !== mode) continue;
      if (!field.required || field.kind === 'custom') continue;
      if (mode === 'edit' && field.readOnlyOnEdit) continue;
      const value = values[field.key];
      const empty = Array.isArray(value) ? value.length === 0 : !String(value ?? '').trim();
      if (empty) errors[field.key] = `${field.label} is required`;
    }
    Object.assign(errors, validate?.(values, mode) ?? {});
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setFormError('Please fix the highlighted fields.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      if (editing) await onUpdate(editing, values);
      else await onCreate(values);
      setDrawerOpen(false);
      setNotice(editing ? `${capitalize(entityName)} updated.` : `${capitalize(entityName)} created.`);
      await refresh();
    } catch (err) {
      setFormError(getAdminErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (row: T) => {
    const next = !row.isActive;
    if (!next && !window.confirm(`Deactivate this ${entityName}? It can be reactivated later.`)) return;
    setBusyId(row.id);
    setNotice(null);
    try {
      await onSetActive(row, next);
      setNotice(`${capitalize(entityName)} ${next ? 'reactivated' : 'deactivated'}.`);
      await refresh();
    } catch (err) {
      setPageError(getAdminErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const allColumns: Column<T>[] = [
    ...columns,
    {
      key: 'isActive',
      header: 'Active',
      render: (row) => (
        <span className={`data-table__badge ${row.isActive ? '' : 'data-table__badge--off'}`}>{row.isActive ? 'Active' : 'Inactive'}</span>
      ),
    },
  ];

  return (
    <div className="resource-page">
      <div className="resource-page__toolbar">
        <div>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        <Button fullWidth={false} onClick={openCreate} disabled={createDisabled}>
          + Create {entityName}
        </Button>
      </div>

      {pageError && <Banner tone="error">{pageError}</Banner>}
      {extraError && <Banner tone="warning">{extraError}</Banner>}
      {notice && <Banner tone="success">{notice}</Banner>}

      <DataTable
        columns={allColumns}
        rows={rows}
        rowKey={(row) => row.id}
        loading={loading}
        emptyMessage={`No ${entityName} records yet.`}
        actions={(row) => (
          <>
            <button
              type="button"
              className="resource-page__icon-btn"
              aria-label={`Edit ${entityName}`}
              title="Edit"
              disabled={busyId === row.id}
              onClick={() => openEdit(row)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              className={`resource-page__icon-btn ${row.isActive ? 'resource-page__icon-btn--danger' : 'resource-page__icon-btn--restore'}`}
              aria-label={row.isActive ? `Deactivate ${entityName}` : `Reactivate ${entityName}`}
              title={row.isActive ? 'Deactivate' : 'Reactivate'}
              disabled={busyId === row.id}
              onClick={() => void handleToggleActive(row)}
            >
              {busyId === row.id ? (
                <span className="resource-page__icon-spinner" aria-hidden />
              ) : row.isActive ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M3 12a9 9 0 1 0 9-9"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                  <path
                    d="M3 4v5h5"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </>
        )}
      />

      <ResourceDrawer
        open={drawerOpen}
        title={editing ? `Edit ${entityName}` : `Create ${entityName}`}
        submitLabel={editing ? 'Save changes' : `Create ${entityName}`}
        submitting={submitting}
        error={formError}
        onClose={closeDrawer}
        onSubmit={() => void handleSubmit()}
      >
        <FormFields fields={fieldDefs} values={values} errors={fieldErrors} editing={editing !== null} disabled={submitting} onChange={handleChange} />
      </ResourceDrawer>
    </div>
  );
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
