-- วางทั้งไฟล์ใน Supabase > SQL Editor > Run
create table if not exists timetable(id bigint generated always as identity primary key,day_no int not null check(day_no between 1 and 7),period int not null,subject text not null,room text,teacher text,created_at timestamptz default now());
create table if not exists scores(id bigint generated always as identity primary key,subject text not null,title text not null,score numeric not null,max_score numeric not null,created_at timestamptz default now());
create table if not exists files(id bigint generated always as identity primary key,title text not null,subject text,url text not null,created_at timestamptz default now());
create table if not exists contacts(id bigint generated always as identity primary key,name text not null,role text,phone text,line text,created_at timestamptz default now());
create table if not exists attendance(id bigint generated always as identity primary key,date date not null unique,status text not null check(status in('present','sick','personal','other')),reason text,created_at timestamptz default now());
create table if not exists tasks(id bigint generated always as identity primary key,title text not null,subject text,due_at timestamptz not null,done boolean default false,created_at timestamptz default now());

-- เปิด RLS และอนุญาต anon (เหมาะกับเว็บส่วนตัวที่ไม่เผยแพร่ลิงก์ ดู README เรื่องความปลอดภัย)
do $$ declare t text; begin
 foreach t in array array['timetable','scores','files','contacts','attendance','tasks'] loop
  execute format('alter table %I enable row level security',t);
  execute format('drop policy if exists "anon_all" on %I',t);
  execute format('create policy "anon_all" on %I for all to anon using(true) with check(true)',t);
 end loop; end $$;

 -- รูปตารางเรียน: bucket สาธารณะสำหรับแสดงรูป และอนุญาต anon จัดการรูปได้
 insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('timetable','timetable',true,10485760,array['image/jpeg','image/png','image/webp'])
 on conflict(id) do update set public=true,file_size_limit=10485760,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

 drop policy if exists "anon_timetable_read" on storage.objects;
 create policy "anon_timetable_read" on storage.objects for select to anon using(bucket_id='timetable');
 drop policy if exists "anon_timetable_upload" on storage.objects;
 create policy "anon_timetable_upload" on storage.objects for insert to anon with check(bucket_id='timetable');
 drop policy if exists "anon_timetable_update" on storage.objects;
 create policy "anon_timetable_update" on storage.objects for update to anon using(bucket_id='timetable') with check(bucket_id='timetable');
 drop policy if exists "anon_timetable_delete" on storage.objects;
 create policy "anon_timetable_delete" on storage.objects for delete to anon using(bucket_id='timetable');
