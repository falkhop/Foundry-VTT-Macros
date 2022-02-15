// A macro for various combinations of attack and damage possibilities for Sunny.

//Additional Todos:
//0. Roll dice on screen
//1. Check for Crit and apply crit damage changes
//2. Add weapon select
//3. Get character based modifiers to remove hardcoded values (dexmod, profbonus, etc)
//4. Tie in checks for resource availability (superiority dice, etc)
//4.5 Update count of remaining resources when resource is used
//5. Refactor for improved readability/reusability
//6. Hit checks and autoupdate target health

main()

async function main(){
    //Create form to gather attack options
    new Dialog({
        title: `Let 'em Fly!`,
        content: `
        <form>   
            <fieldset>
            <legend>Apply Attack Options</legend>
            <div>
                <label>Attack Type:</label>
                <select id="attack-type" name="attak-type">
                    <option value="Normal">Normal</option>
                    <option value="Advantage">Advantage</option>
                    <option value="Disadvantage">Disadvantage</option>
                </select>
            </div>
            <div>
            <input type="checkbox" id="sharpshooter" value="sharpshooter">        
            <label for="sharpshooter">Sharpshooter</label>
            </div>
            <div>
            <input type="checkbox" id="blessed" value="blessed">   
            <label for="blessed">Blessed</label>
            </div>
            <div>
                <label> Battle Maneuver:</label>
                <select id="battle-maneuver" name="battle-maneuver">
                    <option value="None">None</option>
                    <option value="Quick Toss">Quick Toss</option>
                    <option value="Distracting Strike">Distracting Strike</option>
                </select>
            </div>
            </fieldset>
        </form>
        `,
        buttons: {
            //Gather attack and damage modifiers based on selected actions
            yes: {
                icon: "<i class='fas fa-bullseye'></i>",
                label: `Attack!`,
                callback: async (html) => {
                    let attackType = html.find('[id="attack-type"]').val();
                    let battleManeuver = html.find('[id="battle-maneuver"]').val();
                    let sharpShooter = html.find('[id="sharpshooter"]');
                    let blessed = html.find('[id="blessed"]');
                    let attackRollBase = "";
                    let sharpShooterAtkMod = "";
                    let sharpShooterDmgMod = "";
                    let battleManeuverDmgMod = "";
                    let blessMod = "";
                    let attackRollBaseMessage = `${attackType}`;
                    let sharpShooterMessage = "";
                    let battleManeuverMessage = "";
                    let blessedMessage = "";
                
                    if (attackType == "Normal") {
                        attackRollBase = "1d20"
                    } else if (attackType == "Advantage") {
                        attackRollBase = "3d20kh"
                    } else {
                        attackRollBase = "2d20kl"
                    };
    
                    if (sharpShooter[0].checked) {
                        sharpShooterAtkMod = " - 5"
                        sharpShooterDmgMod = " + 10"
                        sharpShooterMessage = ", Sharpshooter"
                    };
            
                    if (battleManeuver != "None") {
                        battleManeuverDmgMod = " + 1d8";
                        battleManeuverMessage = `, ${battleManeuver}`
                    };
            
                    if (blessed[0].checked) {
                        blessMod = " + 1d4"
                        blessedMessage = ", Blessed"
                    };
                    
                    //Create attack and damage roll formulas base on input
                    let attackFormula = `${attackRollBase} + 6${sharpShooterAtkMod}${blessMod}`
                    let attackRoll = new Roll(attackFormula).roll();
                    let attackResult = await attackRoll;
                    let damageFormula = `1d4${battleManeuverDmgMod} + 4 + 2${sharpShooterDmgMod}`
                    let damageRoll = new Roll(damageFormula).roll();
                    let damageResult = await damageRoll;

                    //TODO: Roll dice on screen
                    
                    //Post inputs and results to chat
                    ChatMessage.create({
                        content: `
                            <div class="dice-roll">
                                <b>${attackRollBaseMessage}${sharpShooterMessage}${battleManeuverMessage}${blessedMessage}</b>
                                <div class="dice-result">
                                <h4 class="dice-total">Attack Total: ${attackResult.total}</h4>
                                <div class="dice-tooltip">
                                    <section class="tooltip-part">
                                    <div class="dice">
                                        <div>${attackFormula} = ${attackResult.total}</div>
                                        <div>${attackResult.result} = ${attackResult.total}</div>
                                        <ol class="dice-rolls">
                                            <li class="roll die d20">${attackResult.dice[0].total}</li>
                                        </ol>
                                    </section>
                                </div>
                                <h4 class="dice-total">Damage Total: ${damageResult.total}</h4>
                                <div class="dice-tooltip">
                                    <section class="tooltip-part">
                                        <div>${damageFormula} = ${damageResult.total}</div>
                                        <div>${damageResult.result} = ${damageResult.total}</div>
                                    </section>
                                </div>
                                </div>
                            </div>
                        `,
                    });
                },
            },
        },
    }).render(true)
}