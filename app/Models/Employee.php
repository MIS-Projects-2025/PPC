<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Employee extends Model
{
  protected $table = 'employee_directory';
  protected $primaryKey = 'EMPLOYID';
  public $incrementing = false;
  protected $keyType = 'string';
  public $timestamps = false;
}
