-- Create service_requests table for business inquiries
-- This table is separate from job_applications and workers

create table if not exists public.service_requests (
    id uuid default gen_random_uuid() primary key,
    company_name text,
    contact_name text not null,
    email text not null,
    phone text not null,
    project_type text, -- e.g. Residencial, Comercial, Industrial
    location text, -- City or Commune
    message text,
    status text default 'new' check (status in ('new', 'contacted', 'quoted', 'closed')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.service_requests enable row level security;

-- Policy: Anyone (anon) can submit service requests
create policy "Anyone can submit service request"
    on public.service_requests for insert
    with check (true);

-- Policy: Only authenticated users (admins) can view requests
create policy "Authenticated users can view service requests"
    on public.service_requests for select
    using (auth.role() = 'authenticated');

-- Policy: Only authenticated users can update status
create policy "Authenticated users can update service requests"
    on public.service_requests for update
    using (auth.role() = 'authenticated');

-- Create updated_at trigger
create trigger handle_service_requests_updated_at
    before update on public.service_requests
    for each row
    execute procedure public.handle_updated_at();
