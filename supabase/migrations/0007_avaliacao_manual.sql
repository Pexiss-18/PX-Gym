-- Avaliação digitada no app, para quem não tem o PDF da bioimpedância (fez a
-- avaliação com um personal, por exemplo). Ela já nasce revisada.

alter table body_assessments
  add column if not exists source text not null default 'pdf'
    check (source in ('pdf', 'manual'));

alter table body_assessments
  alter column pdf_path drop not null;

-- Toda avaliação de PDF continua precisando do arquivo.
alter table body_assessments
  drop constraint if exists body_assessments_pdf_path_by_source;
alter table body_assessments
  add constraint body_assessments_pdf_path_by_source
    check (source = 'manual' or pdf_path is not null);
