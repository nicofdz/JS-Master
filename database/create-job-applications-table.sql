-- Create job_applications table completely separate from workers
-- This table is for external applicants only

create table if not exists public.job_applications (
    id uuid default gen_random_uuid() primary key,
    full_name text not null,
    rut text not null,
    email text not null,
    phone text not null,
    experience_years integer,
    specialization text,  -- e.g. Maestro Pintor, Ayudante, Carpintero
    message text,
    status text default 'pending' check (status in ('pending', 'reviewed', 'contacted', 'rejected', 'hired')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.job_applications enable row level security;

-- Policy: Anyone (anon) can insert applications
create policy "Anyone can submit job application"
    on public.job_applications for insert
    with check (true);

-- Policy: Only authenticated users (admins) can view applications
create policy "Authenticated users can view applications"
    on public.job_applications for select
    using (auth.role() = 'authenticated');

-- Policy: Only authenticated users can update status
create policy "Authenticated users can update applications"
    on public.job_applications for update
    using (auth.role() = 'authenticated');

-- Policy: Only authenticated users can delete applications
create policy "Authenticated users can delete applications"
    on public.job_applications for delete
    using (auth.role() = 'authenticated');

-- Create updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger handle_job_applications_updated_at
    before update on public.job_applications
    for each row
    execute procedure public.handle_updated_at();
