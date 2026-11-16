import { ResourcePage } from '../../components/admin/ResourcePage';
import { partnersApi, type PartnerFields } from '../../lib/adminApi';
import type { FieldDef, FormValues } from '../../components/admin/FormFields';
import type { Partner, PartnerType } from '../../types/api';

const FIELDS: FieldDef[] = [
  { key: 'name', label: 'Name', kind: 'text', required: true },
  {
    key: 'partnerType',
    label: 'Partner type',
    kind: 'select',
    required: true,
    options: [
      { value: 'vendor', label: 'Vendor' },
      { value: 'retailer', label: 'Retailer' },
    ],
  },
  { key: 'uniqueIdentifier', label: 'Unique identifier', kind: 'text', required: true, hint: 'Merchant / registration code. Must be unique.' },
  { key: 'email', label: 'Email', kind: 'email', hint: 'Used for automated notifications.' },
  { key: 'address', label: 'Address', kind: 'text', required: true },
  { key: 'city', label: 'City', kind: 'text', required: true },
  { key: 'state', label: 'State', kind: 'text', required: true },
  { key: 'zipCode', label: 'Zip code', kind: 'text', required: true },
  { key: 'country', label: 'Country', kind: 'text', required: true },
];

const EMPTY: FormValues = {
  name: '',
  partnerType: '',
  uniqueIdentifier: '',
  email: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  country: '',
};

const s = (v: FormValues, key: string) => String(v[key] ?? '').trim();

function toPayload(v: FormValues): PartnerFields {
  return {
    name: s(v, 'name'),
    partnerType: v.partnerType as PartnerType,
    uniqueIdentifier: s(v, 'uniqueIdentifier'),
    email: s(v, 'email'),
    address: s(v, 'address'),
    city: s(v, 'city'),
    state: s(v, 'state'),
    zipCode: s(v, 'zipCode'),
    country: s(v, 'country'),
  };
}

function validate(v: FormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  const email = s(v, 'email');
  if (email && !/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Enter a valid email address';
  return errors;
}

export function PartnersPage() {
  return (
    <ResourcePage<Partner>
      title="Partners"
      entityName="partner"
      columns={[
        { key: 'id', header: 'ID', render: (r) => r.id },
        { key: 'name', header: 'Name', render: (r) => r.name },
        { key: 'type', header: 'Type', render: (r) => r.partnerType },
        { key: 'uid', header: 'Identifier', render: (r) => r.uniqueIdentifier },
        { key: 'city', header: 'City', render: (r) => r.city },
        { key: 'email', header: 'Email', render: (r) => r.email || '—' },
      ]}
      load={() => partnersApi.search()}
      fields={() => FIELDS}
      emptyValues={EMPTY}
      toFormValues={(r) => ({
        name: r.name,
        partnerType: r.partnerType,
        uniqueIdentifier: r.uniqueIdentifier,
        email: r.email ?? '',
        address: r.address,
        city: r.city,
        state: r.state,
        zipCode: r.zipCode,
        country: r.country,
      })}
      validate={validate}
      onCreate={(v) => {
        const payload = toPayload(v);
        return partnersApi.create({ ...payload, email: payload.email || undefined });
      }}
      onUpdate={(row, v) => partnersApi.update(row.id, toPayload(v))}
      onSetActive={(row, isActive) => partnersApi.update(row.id, { isActive })}
    />
  );
}
