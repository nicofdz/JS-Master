import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        const today = new Date().toISOString().split('T')[0]

        // 1. Get overdue tasks OR tasks already marked as delayed
        const { data: overdueTasks, error: tasksError } = await supabaseAdmin
            .from('apartment_tasks')
            .select('id, task_name, end_date, is_delayed')
            .neq('status', 'completed')
            .neq('status', 'blocked')
            .or(`end_date.lt.${today},is_delayed.eq.true`)

        if (tasksError) {
            console.error('Error fetching overdue tasks:', tasksError)
            return NextResponse.json({ error: tasksError.message }, { status: 500 })
        }

        if (!overdueTasks || overdueTasks.length === 0) {
            return NextResponse.json({ message: 'No overdue tasks found', count: 0 })
        }

        // 2. Get all admins to notify
        const { data: admins, error: adminsError } = await supabaseAdmin
            .from('user_profiles')
            .select('id')
            .eq('role', 'admin')

        if (adminsError) {
            console.error('Error fetching admins:', adminsError)
            return NextResponse.json({ error: adminsError.message }, { status: 500 })
        }

        // 3. Check existing notifications for these tasks to avoid duplicates
        const taskIds = overdueTasks.map(t => t.id)
        const { data: existingNotifs, error: notifsError } = await supabaseAdmin
            .from('notifications')
            .select('related_id, user_id')
            .eq('type', 'task_delayed')
            .in('related_id', taskIds)

        if (notifsError) {
            console.error('Error checking existing notifications:', notifsError)
            return NextResponse.json({ error: notifsError.message }, { status: 500 })
        }

        const notificationsToInsert = []
        const tasksToUpdateFlag = []

        for (const task of overdueTasks) {
            // If task is not marked delayed yet, mark it
            if (!task.is_delayed) {
                tasksToUpdateFlag.push(task.id)
            }

            const message = `La tarea "${task.task_name}" ha excedido su fecha límite (${task.end_date}).`

            for (const admin of admins) {
                // Check if this admin already got notified for this task
                const alreadyNotified = existingNotifs?.some(
                    n => n.related_id === task.id && n.user_id === admin.id
                )

                if (!alreadyNotified) {
                    notificationsToInsert.push({
                        user_id: admin.id,
                        title: 'Tarea Atrasada',
                        message: message,
                        type: 'task_delayed',
                        related_table: 'apartment_tasks',
                        related_id: task.id,
                        link: '/tareas', // Or specific link logic
                        created_at: new Date().toISOString()
                    })
                }
            }
        }

        // 4. Insert notifications
        if (notificationsToInsert.length > 0) {
            const { error: insertError } = await supabaseAdmin
                .from('notifications')
                .insert(notificationsToInsert)

            if (insertError) {
                console.error('Error inserting notifications:', insertError)
                return NextResponse.json({ error: insertError.message }, { status: 500 })
            }
        }

        // 5. Update flags (catch-up for those that were missed)
        if (tasksToUpdateFlag.length > 0) {
            const { error: updateError } = await supabaseAdmin
                .from('apartment_tasks')
                .update({ is_delayed: true })
                .in('id', tasksToUpdateFlag)

            if (updateError) {
                console.error('Error updating task flags:', updateError)
                return NextResponse.json({ error: updateError.message }, { status: 500 })
            }
        }

        return NextResponse.json({
            message: 'Processed overdue tasks',
            checkedTasks: overdueTasks.length,
            notificationsSent: notificationsToInsert.length,
            flagsUpdated: tasksToUpdateFlag.length
        })

    } catch (error: any) {
        console.error('Server error checking delays:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
