import { ResourcePage } from '../../components/admin/ResourcePage';
import { partnerLocationsApi, partnersApi, rolesApi, usersApi } from '../../lib/adminApi';
import { nameResolver, toOptions, useAdminLookup } from '../../hooks/useAdminLookup';
import type { FieldDef, FormValues } from '../../components/admin/FormFields';
import type { AdminUser } from '../../types/api';

const s = (v: FormValues, key: string) => String(v[key] ?? '').trim();

export function UsersPage() {
  const locations = useAdminLookup(() => partnerLocationsApi.search(), 'locations');
  const partners = useAdminLookup(() => partnersApi.search(), 'partners');
  const roles = useAdminLookup(() => rolesApi.search({ isActive: true }), 'roles');
  const partnerName = nameResolver(partners.items, (p) => p.name);
  const locationName = nameResolver(locations.items, (l) => `${l.name} (${partnerName(l.partnerId)})`);

  const fields = (editing: AdminUser | null): FieldDef[] => [
    {
      key: 'mobile',
      label: 'Mobile',
      kind: 'tel',
      required: true,
      maxLength: 10,
      placeholder: '10-digit mobile number',
      readOnlyOnEdit: true,
      hint: 'Used for OTP login. Cannot be changed after onboarding.',
    },
    { key: 'name', label: 'Name', kind: 'text' },
    { key: 'username', label: 'Username', kind: 'text' },
    { key: 'email', label: 'Email', kind: 'email' },
    {
      key: 'partnerLocationId',
      label: 'Location',
      kind: 'select',
      required: true,
      options: toOptions(locations.items, (l) => `${l.name} (${partnerName(l.partnerId)})`, editing?.partnerLocationId),
    },
    {
      key: 'roleIds',
      label: 'Roles',
      kind: 'multiselect',
      mode: 'create',
      options: roles.items.map((r) => ({ value: String(r.id), label: r.name })),
    },
  ];

  return (
    <ResourcePage<AdminUser>
      title="Users"
      entityName="user"
      columns={[
        { key: 'id', header: 'ID', render: (r) => r.id },
        { key: 'mobile', header: 'Mobile', render: (r) => r.mobile },
        { key: 'name', header: 'Name', render: (r) => r.name || '—' },
        { key: 'username', header: 'Username', render: (r) => r.username || '—' },
        { key: 'location', header: 'Location', render: (r) => locationName(r.partnerLocationId) },
      ]}
      load={() => usersApi.search()}
      fields={fields}
      emptyValues={{ mobile: '', name: '', username: '', email: '', partnerLocationId: '', roleIds: [] }}
      toFormValues={(r) => ({
        mobile: r.mobile,
        name: r.name ?? '',
        username: r.username ?? '',
        email: r.email ?? '',
        partnerLocationId: r.partnerLocationId !== undefined ? String(r.partnerLocationId) : '',
        roleIds: [],
      })}
      validate={(v, mode) => {
        const errors: Record<string, string> = {};
        if (mode === 'create' && !/^[0-9]{10}$/.test(s(v, 'mobile'))) errors.mobile = 'Enter a valid 10-digit mobile number';
        if (s(v, 'email') && !/^\S+@\S+\.\S+$/.test(s(v, 'email'))) errors.email = 'Enter a valid email address';
        return errors;
      }}
      onCreate={(v) =>
        usersApi.create({
          mobile: s(v, 'mobile'),
          partnerLocationId: Number(v.partnerLocationId),
          name: s(v, 'name') || undefined,
          username: s(v, 'username') || undefined,
          email: s(v, 'email') || undefined,
          roleIds: (v.roleIds as string[]).map(Number),
        })
      }
      onUpdate={(row, v) =>
        usersApi.update(row.id, {
          name: s(v, 'name'),
          username: s(v, 'username'),
          email: s(v, 'email'),
          partnerLocationId: Number(v.partnerLocationId),
        })
      }
      onSetActive={(row, isActive) => usersApi.update(row.id, { isActive })}
      extraError={locations.error ?? partners.error ?? roles.error}
    />
  );
}
