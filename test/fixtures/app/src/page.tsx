export function Page() {
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
        </div>
    );
}
export const ring = 'shadow-[0_0_0_1px_var(--line)]';
export const glow = 'shadow-[0_0_24px_var(--brand)]';
