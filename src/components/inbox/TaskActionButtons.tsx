import { Link } from 'react-router-dom'
import {
  advanceActionForRouteAction,
  completeActionLabel,
  type InboxTask,
} from '../../types/domain'

interface TaskActionButtonsProps {
  task: InboxTask
  isAdvancing?: boolean
  onAdvance?: (task: InboxTask) => void
}

export function TaskActionButtons({ task, isAdvancing = false, onAdvance }: TaskActionButtonsProps) {
  const advanceAction = advanceActionForRouteAction(task.action)

  if (task.action === 'sign') {
    return (
      <Link className="button primary" to={`/sign/${task.id}`}>
        {completeActionLabel(task.action)}
      </Link>
    )
  }

  return (
    <div className="button-row">
      <Link className="button secondary" to={`/sign/${task.id}`}>
        Open
      </Link>
      {advanceAction && onAdvance ? (
        <button
          className="button primary"
          type="button"
          disabled={isAdvancing}
          onClick={() => onAdvance(task)}
        >
          {isAdvancing ? 'Completing…' : completeActionLabel(task.action)}
        </button>
      ) : null}
    </div>
  )
}
