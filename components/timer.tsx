interface TimerProps {
    time: number
}

export function Timer({time}:TimerProps) {
    return (
    <p className="absolute inset-0 flex items-center justify-center text-white text-7xl bold">
        {time == 1 ? "Smile! 📸" : time - 1}
    </p>
    )
}