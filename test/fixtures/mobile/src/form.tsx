export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 1 };

export function Form() {
    return (
        <form>
            <input className="rounded-md text-sm" />
            <Input className="text-[14px]" />
            <input className="text-base sm:text-sm" />
            <input
                type="file"
                className="text-sm file:rounded-full"
            />
            <p className="text-sm">Small text outside a field is fine</p>
            <div className="h-screen">Fixed</div>
            <div className="h-screen h-dvh">Has a partner</div>
            <div className="min-h-screen md:h-screen">Min height and from tablet up</div>
            <button className="opacity-0 group-hover:opacity-100">Hidden until hover</button>
            <button className="group-hover:flex hidden">Hidden until hover, other order</button>
            <button className="opacity-100 md:opacity-0 md:group-hover:opacity-100">Hidden from tablet up only</button>
            <a className="opacity-70 hover:opacity-100">Dim, always visible</a>
            <button className="hover:bg-gray-100 duration-500">Slow</button>
            <button className="duration-[800ms] active:scale-95">Slow press</button>
            <button className="hover:bg-gray-100 duration-200">Quick</button>
            <div className="duration-700 opacity-100">An entrance, no state</div>
            <div className="animate-[drift_4s_ease-in-out_infinite]">Endless</div>
            <div className="animate-[spin_1s_linear_infinite]">Loader</div>
        </form>
    );
}
