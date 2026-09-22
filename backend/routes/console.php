<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('whats-new:sync')->dailyAt('00:00');
