import { ResourcePage } from '../../components/admin/ResourcePage';
import { partnerLocationsApi, partnersApi } from '../../lib/adminApi';
import { nameResolver, toOptions, useAdminLookup } from '../../hooks/useAdminLookup';
import type { FieldDef, FormValues } from '../../components/admin/FormFields';
import type { PartnerLocation } from '../../types/api';

const s = (v: FormValues, key: string) => String(v[key] ?? '').trim();

export function PartnerLocationsPage() {
  const partners = useAdminLookup(() => partnersApi.search(), 'partners');
  const partnerName = nameResolver(partners.items, (p) => p.name);

  const fields = (editing: PartnerLocation | null): FieldDef[] => [
    {
      key: 'partnerId',
      label: 'Partner',
      kind: 'select',
      required: true,
      options: toOptions(partners.items, (p) => `${p.name} (${p.partnerType})`, editing?.partnerId),
    },
    { key: 'name', label: 'Name', kind: 'text', required: true },
    { key: 'uniqueIdentifier', label: 'Unique identifier', kind: 'text', required: true, hint: 'Must be unique across locations.' },
    { key: 'email', label: 'Email', kind: 'email', hint: 'Receives purchase receipts for buybacks at this location.' },
    { key: 'address', label: 'Address', kind: 'text', required: true },
    { key: 'city', label: 'City', kind: 'text', required: true },
    { key: 'state', label: 'State', kind: 'text', required: true },
    { key: 'zipCode', label: 'Zip code', kind: 'text', required: true },
    { key: 'country', label: 'Country', kind: 'text', required: true },
  ];

  const toPayload = (v: FormValues) => ({
    partnerId: Number(v.partnerId),
    name: s(v, 'name'),
    uniqueIdentifier: s(v, 'uniqueIdentifier'),
    email: s(v, 'email'),
    address: s(v, 'address'),
    city: s(v, 'city'),
    state: s(v, 'state'),
    zipCode: s(v, 'zipCode'),
    country: s(v, 'country'),
  });

  return (
    <ResourcePage<PartnerLocation>
      title="Partner Locations"
      entityName="location"
      columns={[
        { key: 'id', header: 'ID', render: (r) => r.id },
        { key: 'name', header: 'Name', render: (r) => r.name },
        { key: 'partner', header: 'Partner', render: (r) => partnerName(r.partnerId) },
        { key: 'uid', header: 'Identifier', render: (r) => r.uniqueIdentifier },
        { key: 'city', header: 'City', render: (r) => r.city },
        { key: 'email', header: 'Email', render: (r) => r.email || '—' },
      ]}
      load={() => partnerLocationsApi.search()}
      fields={fields}
      emptyValues={{ partnerId: '', name: '', uniqueIdentifier: '', email: '', address: '', city: '', state: '', zipCode: '', country: '' }}
      toFormValues={(r) => ({
        partnerId: String(r.partnerId),
        name: r.name,
        uniqueIdentifier: r.uniqueIdentifier,
        email: r.email ?? '',
        address: r.address,
        city: r.city,
        state: r.state,
        zipCode: r.zipCode,
        country: r.country,
      })}
      validate={(v): Record<string, string> => (s(v, 'email') && !/^\S+@\S+\.\S+$/.test(s(v, 'email')) ? { email: 'Enter a valid email address' } : {})}
      onCreate={(v) => {
        const payload = toPayload(v);
        return partnerLocationsApi.create({ ...payload, email: payload.email || undefined });
      }}
      onUpdate={(row, v) => partnerLocationsApi.update(row.id, toPayload(v))}
      // The server requires partnerId on every location update, even a plain deactivate.
      onSetActive={(row, isActive) => partnerLocationsApi.update(row.id, { partnerId: row.partnerId, isActive })}
      extraError={partners.error}
    />
  );
}
