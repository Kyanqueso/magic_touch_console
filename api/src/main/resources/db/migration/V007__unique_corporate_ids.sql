-- A government ID or an agency registration number identifies one real entity,
-- so no two active corporate profiles may share one.
--
-- Pre-flight: list every existing duplicate in a single error so they can all be
-- cleaned in one pass, rather than the index builds failing one column at a time.
do $$
declare
    conflicts text;
begin
    select string_agg(line, E'\n') into conflicts
    from (
        select format('corporate_profiles.tin  = %s   (ids: %s)', tin, string_agg(id::text, ', ')) as line
            from corporate_profiles
            where tin is not null and archived_at is null
            group by tin having count(*) > 1
        union all
        select format('corporate_profiles.sss  = %s   (ids: %s)', sss, string_agg(id::text, ', '))
            from corporate_profiles
            where sss is not null and archived_at is null
            group by sss having count(*) > 1
        union all
        select format('corporate_profiles.phic = %s   (ids: %s)', phic, string_agg(id::text, ', '))
            from corporate_profiles
            where phic is not null and archived_at is null
            group by phic having count(*) > 1
        union all
        select format('corporate_profiles.hdmf = %s   (ids: %s)', hdmf, string_agg(id::text, ', '))
            from corporate_profiles
            where hdmf is not null and archived_at is null
            group by hdmf having count(*) > 1
        union all
        select format('business_registrations %s number = %s   (ids: %s)',
                      body, min(registration_no), string_agg(id::text, ', '))
            from business_registrations
            group by body, lower(registration_no) having count(*) > 1
    ) t;

    if conflicts is not null then
        raise exception E'V007 needs unique government IDs. Resolve these duplicates, then re-run:\n%', conflicts;
    end if;
end $$;

create unique index corporate_profiles_tin_uk
    on corporate_profiles (tin)  where tin  is not null and archived_at is null;
create unique index corporate_profiles_sss_uk
    on corporate_profiles (sss)  where sss  is not null and archived_at is null;
create unique index corporate_profiles_phic_uk
    on corporate_profiles (phic) where phic is not null and archived_at is null;
create unique index corporate_profiles_hdmf_uk
    on corporate_profiles (hdmf) where hdmf is not null and archived_at is null;

-- DTI / SEC / CDA registration numbers are unique per agency.
create unique index business_registrations_body_no_uk
    on business_registrations (body, lower(registration_no));
