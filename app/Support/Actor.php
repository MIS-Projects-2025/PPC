<?php

namespace App\Support;

class Actor
{
    /** Employee ID of whoever triggered this request. Null in console/jobs or when logged out. */
    public static function id(): ?string
    {
        try {
            $req = request();
            $id = $req->attributes->get('emp_id')
                ?? $req->attributes->get('auth_user')?->emp_id
                ?? session('emp_data.emp_id');

            return ($id === null || $id === '') ? null : (string) $id;
        } catch (\Throwable) {
            return null;
        }
    }
}
