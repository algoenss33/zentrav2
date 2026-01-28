import { cn } from '@/lib/utils'
import NodeNetworkBackground from '@/components/node-network-background'

function Spinner({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn('flex items-center justify-center', className)}
      {...props}
    >
      <NodeNetworkBackground
        size={56}
        showCenterLogo={false}
        className="node-network-spinner"
      />
    </div>
  )
}

export { Spinner }
