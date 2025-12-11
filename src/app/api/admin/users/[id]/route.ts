import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        // 1. Check if the current user is an Admin
        // Get token from Authorization header
        const authHeader = request.headers.get('Authorization')
        const token = authHeader?.split(' ')[1]

        if (!token) {
            return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser(token)

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const targetUserId = params.id
        if (!targetUserId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
        }

        // 2. Initialize Admin Client
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

        // 3. Delete the user from Auth (auth.users)
        // This typically cascades to user_profiles if configured correctly.
        // If not, we might need to manually delete from user_profiles here too.
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
            targetUserId
        )

        if (deleteError) {
            console.error('Error deleting auth user:', deleteError)
            return NextResponse.json({ error: deleteError.message }, { status: 500 })
        }

        return NextResponse.json({ message: 'User deleted successfully' })

    } catch (error: any) {
        console.error('Server error deleting user:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
