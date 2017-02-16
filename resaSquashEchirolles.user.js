// ==UserScript==
// @name         FindSlots
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        http://pro.solution-rendez-vous.com/lebreaksportif/rendez-vous/index.php*
// @update       https://github.com/brisssou/resaSquashEchirolles/raw/master/resaSquashEchirolles.user.js
// @grant        none
// ==/UserScript==

if(typeof jQuery === 'undefined'|| !jQuery){
    (function(){
        var s=document.createElement('script');
        s.setAttribute('src','https://ajax.googleapis.com/ajax/libs/jquery/3.1.1/jquery.min.js');
        if(typeof jQuery=='undefined'){
            document.getElementsByTagName('head')[0].appendChild(s);
        }
    })();
}

var OK_DAYS = ['Monday',
               'Tuesday',
               'Wednesday',
               'Thursday',
               'Friday'];

var OK_TERRAINS = [1, 3, 4, 5]; // Terrain 2 is only 12:30 => no use

var foundSlots = {};
var foundSlotsDay = [];

function getDayString(weekIncr) {
    var today = new Date();
    // those are not real weeks, but 10 days long slots
    today.setDate(today.getDate() + 10 * weekIncr);
    var dd = today.getDate()+1; // tomorrow
    var mm = today.getMonth()+1; // January is 0

    var yyyy = today.getFullYear();
    if (dd < 10) {
        dd = '0' + dd;
    }
    if(mm < 10) {
        mm = '0' + mm;
    }
    return yyyy + '-' + mm + '-' + dd;
}

var idclient = -1;

(function() {
    'use strict';

    var codeToExecute = function() {
        $.ajax({
            type: "POST",
            url: '/lebreaksportif/rendez-vous/php/services.php',
            data:{
                _name : 'getChampsPersos',
                _version: 2
            },
            success: function(data) {
                data = $.parseJSON(data);
                if (data[0].retour === 0) {
                    idclient = data[0].idclient;
                }
            },
            datatype:'json'
        });

        function book(evt) {
            evt.preventDefault();
            if (idclient == -1) {
                alert('Personnal data not loaded. Are you connected?');
                return;
            }
            $.ajax({
                type: "POST",
                url: '/lebreaksportif/rendez-vous/php/services.php',
                data: {_name: 'confirmerRdv',
                       _idclient: idclient,
                       _agendas: $(this).attr('data-agenda'),
                       _agendaorigine: $(this).attr('data-agenda-origine'),
                       _ressources: -1,
                       _prestations: 1,
                       _dt: $(this).attr('data-date'),
                       _time: $(this).attr('data-time'),
                       _internet: 'O',
                       _version: 2
                      }
            }).done(
                function(_this){
                    return function() {
                        alert('OK on ' +
                              _this.attr('data-date') +
                              ' ' +
                              _this.attr('data-time') +
                              ' for field ' +
                              _this.attr('data-agenda') +
                              '\nCheck your mailbox.');
                    };
                }($(this))
            );

        }

        function display() {
            foundSlotsDay.sort(function(a,b) {
                return a.localeCompare(b);
            });
            $.each(foundSlotsDay, function(indx, slotsDay) {
                var hideSharp = foundSlots[slotsDay].length > 2;
                $.each(foundSlots[slotsDay], function(_hideSharp) {
                    return function(idx, slot) {
                        if (_hideSharp && slot.idp.endsWith('00')) {
                            return;
                        }
                        var anchorID = slot.dj + slot.idp.replace(':','');
                        $('<p><a href="#" id="' + anchorID +
                          '" class="selection-horaire-perso" data-date="' + slot.dj +
                          '" data-time="' + slot.idp + ':00" data-agenda="' + slot.ida +
                          '" data-agenda-origine="' + slot.idao + '">' +
                          slot.nj + ' ' + slot.idp + ' terrain ' + slot.ida + ' ' + slot.dj + '</a></p>')
                            .appendTo($('#zone_horaire'));
                        $('#'+anchorID).bind('click', book);
                    };
                }(hideSharp));
                $('<hr/>').appendTo($('#zone_horaire'));
            });
        }

        var displayHandle = setTimeout(display, 5000);

        $.each([0,1,2,3], function (inx, week) {
            var dayStr = getDayString(week);
            $.each(OK_TERRAINS,
                   function(_dayStr){
                return function (indx, terrain) {
                    $.ajax({
                        type: "POST",
                        url: '/lebreaksportif/rendez-vous/php/services.php',
                        data: {'_name':'rechercherPlages',
                               '_idpresta':1,
                               '_idagenda':terrain,
                               '_noperiode':'0',
                               '_datedebut':_dayStr,
                               '_version':'2'},
                        success: function( data ) {
                            data = $.parseJSON(data);
                            for (var i = 0; i < data.length; i++) {
                                var dayData = data[i];
                                if ($.inArray(dayData.nj, OK_DAYS) > -1) {
                                    for (var j = 0; j < dayData.det.length; j++) {
                                        var dayDet = dayData.det[j];
                                        var slotStart = dayDet.idp;
                                        if (slotStart.startsWith('12') &&
                                            (slotStart.endsWith('00') ||
                                             slotStart.endsWith('15'))) {
                                            var idDay = dayData.dj + dayData.idp;
                                            if (!(idDay in foundSlots)) {
                                                foundSlots[idDay] = [];
                                                foundSlotsDay.push(idDay);
                                            }
                                            foundSlots[idDay].push(dayDet.rdvmulti[0]);
                                            clearTimeout(displayHandle);
                                            displayHandle = setTimeout(display, 1500);
                                        }
                                    }
                                }
                            }
                        },
                        datatype:'json'
                    });
                };
            }(dayStr));
        });
    };

    var intervalInt = window.setInterval(function(){
        if(typeof jQuery !== 'undefined' && jQuery){
            window.clearInterval(intervalInt);
            codeToExecute();
        }
    }, 100);
})();
