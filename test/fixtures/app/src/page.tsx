import { cn } from './cn';

export function Page({ count, active }: { count: number; active: boolean }) {
    // A comment that mentions text-[10px] and Seamless must not be reported.
    return (
        <div className="rounded-3xl p-6">
            <p className="text-[10px] text-muted-foreground">tiny</p>
            <p className="text-2xs">fine</p>
            <span className="rounded-[2px] size-2" />
            <div className="rounded-[28px]">hero</div>
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Section</span>
            <h1 className="bg-gradient-to-r from-purple-500 to-cyan-400 bg-clip-text">Big</h1>
            <div className="border-l-4 border-l-red-500">alert</div>
            <span className="animate-ping" />
            <p>✨ Seamless onboarding</p>
            <Button label="Takip Et" />
            <Button label="Takip et" />
            <Field title="Google Search Console" />
            {t('Rank Tracking')}
            <div className="shadow-[0_0_0_1px_var(--line)]">ring</div>
            <div className="shadow-[0_0_24px_var(--brand)]">glow</div>
            <a className={cn('outline-none', active && 'text-primary')}>link</a>
            <a className={cn('outline-none focus-visible:ring-2')}>link with ring</a>
            <button type="button" onClick={() => count + 1}>
                <TrashIcon />
            </button>
            <Button aria-label="Delete keyword">
                <TrashIcon />
            </Button>
            <Button variant="ghost" className="w-full rounded-full bg-red-500 px-6">override</Button>
            <Button className="mt-2 w-full">placed</Button>
            <input className="rounded-xl" />
            <input type="hidden" name="token" />
            <span>{label.toUpperCase()}</span>
            <span>{label.toLocaleUpperCase('tr')}</span>
            <span>{price.toFixed(2)}</span>
            <span>{count === 1 ? 'item' : 'items'}</span>
            <span className={rank === 1 ? 'border-foreground/15' : 'border-transparent'}>{rank === 1 ? t('Number 1') : t('Top :rank')}</span>
            <Dialog className="outline-none">dialog</Dialog>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs">New</span>
            <span className="text-xs text-muted-foreground">plain</span>
            <Card className="flex gap-3 p-2 text-sm">laid out</Card>
            <Card className="bg-red-500">recoloured</Card>
            <div className="flex gap-4 p-4">spaced</div>
            <h2 className="font-display text-2xl font-semibold">Title</h2>
            <a href="/register" className="rounded-full bg-ink px-4 py-2 text-white">Start</a>
            {/* ai-design-check-ignore-next-line focus-ring-removed -- the wrapping group draws the focus ring */}
            <Input
                data-slot="multi-line"
                className="outline-none"
            />
            <a href={url}>{url.replace(/^https:\/\//, '')}<ExternalLinkIcon /></a>
            <span>{t('Saved') + ' ' + t('today')}</span>
            <div className="transition-all duration-200">moving</div>
            <div className="animate-bounce">bouncy</div>
            <Button>Submit</Button>
            <p>Something went wrong</p>
            <p>Loading...</p>
            {/* ai-design-check-ignore-next-line type-scale -- legacy hero, redesign in Q1 */}
            <p className="text-[13px]">ignored with a reason</p>
            {/* ai-design-check-ignore-next-line type-scale */}
            <p className="text-[15px]">ignore without a reason does not count</p>
            <div className="flex items-center gap-3 rounded-2xl bg-card p-5 ring-1 ring-foreground/5 shadow-sm">a</div>
            <div className="flex items-center gap-3 rounded-2xl bg-card p-5 ring-1 ring-foreground/5 shadow-sm">b</div>
            <div className="flex items-center gap-3 rounded-2xl bg-card p-5 ring-1 ring-foreground/5 shadow-sm w-full">c</div>
        </div>
    );
}
