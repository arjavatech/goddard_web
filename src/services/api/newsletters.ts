import { authedFetch, z } from './common';

const childContextSchema = z.object({ childId: z.string(), classroomId: z.string(), classroomName: z.string() });
const newsletterSchema = z.object({
  id: z.string(), school_id: z.string(), title: z.string(), content_blocks: z.unknown(), rendered_html: z.string(),
  audience_scope: z.enum(['school', 'classrooms']), classroom_ids: z.array(z.string()),
  status: z.enum(['draft', 'scheduled', 'published', 'archived']), scheduled_at: z.string().nullable(),
  school_timezone: z.string(), reminder_offsets_days: z.array(z.number()), published_at: z.string().nullable(),
  archived_at: z.string().nullable(), created_at: z.string(), updated_at: z.string(),
  applicable_children: z.array(childContextSchema).nullable().optional(),
});
export type Newsletter = z.infer<typeof newsletterSchema>;
export type NewsletterBlock = { type: 'header' | 'text' | 'image' | 'callout' | 'cta' | 'divider' | 'footer'; title?: string; body?: string; imageUrl?: string; alt?: string; linkUrl?: string; linkLabel?: string };
export type NewsletterInput = { schoolId: string; title: string; blocks: NewsletterBlock[]; html: string; audienceScope: 'school' | 'classrooms'; classroomIds: string[]; schoolTimezone?: string };
const listSchema = z.object({ items: z.array(newsletterSchema), total: z.number() });

export function renderNewsletterHtml(blocks: NewsletterBlock[]): string {
  const esc = (value = '') => value.replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]!));
  return `<article style="max-width:680px;margin:auto;background:#fff;color:#24364b;font-family:Arial,sans-serif;line-height:1.6">${blocks.map(block => {
    if (block.type === 'header') return `<header style="background:#0F2D52;color:#fff;padding:38px 40px;text-align:center"><h1 style="margin:0;font-size:30px">${esc(block.title)}</h1><p style="margin:8px 0 0;color:#cfe6ff">${esc(block.body)}</p></header>`;
    if (block.type === 'text') return `<section style="padding:28px 40px;border-bottom:1px solid #e5e7eb"><h2 style="color:#0F2D52">${esc(block.title)}</h2><p>${esc(block.body).replace(/\n/g, '<br>')}</p></section>`;
    if (block.type === 'image') return `<figure style="margin:0;padding:28px 40px"><img src="${esc(block.imageUrl)}" alt="${esc(block.alt)}" style="display:block;width:100%;border-radius:12px"><figcaption>${esc(block.body)}</figcaption></figure>`;
    if (block.type === 'callout') return `<aside style="margin:28px 40px;padding:24px;border-radius:12px;background:#EFF5FB"><strong>${esc(block.title)}</strong><p>${esc(block.body)}</p></aside>`;
    if (block.type === 'cta') return `<section style="padding:28px 40px;text-align:center"><a href="${esc(block.linkUrl)}" style="display:inline-block;background:#1a6fc4;color:white;padding:12px 22px;border-radius:24px;text-decoration:none;font-weight:bold">${esc(block.linkLabel || block.title)}</a></section>`;
    if (block.type === 'divider') return '<hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 40px">';
    return `<footer style="background:#0F2D52;color:#dbeafe;padding:24px 40px;text-align:center">${esc(block.body)}</footer>`;
  }).join('')}</article>`;
}

export async function fetchNewsletters(params: { schoolId?: string; limit?: number; offset?: number } = {}) { const q = new URLSearchParams(); if (params.schoolId) q.set('school_id', params.schoolId); if (params.limit) q.set('limit', String(params.limit)); if (params.offset) q.set('offset', String(params.offset)); return authedFetch({ method: 'GET', url: `/newsletters${q.size ? `?${q}` : ''}` }, listSchema); }
export async function fetchNewsletter(id: string) { return authedFetch({ method: 'GET', url: `/newsletters/${encodeURIComponent(id)}` }, newsletterSchema); }
export async function createNewsletter(input: NewsletterInput) { return authedFetch({ method: 'POST', url: '/newsletters', body: { schoolId: input.schoolId, title: input.title, contentBlocks: input.blocks, renderedHtml: input.html, audienceScope: input.audienceScope, classroomIds: input.classroomIds, schoolTimezone: input.schoolTimezone } }, newsletterSchema); }
export async function publishNewsletter(id: string, scheduledAt?: string, schoolTimezone?: string, reminderOffsetsDays: number[] = []) { return authedFetch({ method: 'POST', url: `/newsletters/${encodeURIComponent(id)}/publish`, body: { scheduledAt, schoolTimezone, reminderOffsetsDays } }, newsletterSchema); }
export async function archiveNewsletter(id: string) { await authedFetch({ method: 'POST', url: `/newsletters/${encodeURIComponent(id)}/archive` }, z.unknown()); }
