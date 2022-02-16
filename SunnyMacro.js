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

class DialogButton {
    constructor(icon, label, callback) {
        this.icon = icon;
        this.label = label;
        this.callback = callback;
    }
}

const AttackType = {
    Normal: "Normal",
    Advantage: "Advantage",
    Disadvantage: "Disadvantage"
}

const title = "Let 'em Fly!"

const mainHtml = `
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
`

class AttackSummary {
    constructor(html) {
        this.attackType = html.find('[id="attack-type"]').val();
        this.hasBattleManeuver = html.find('[id="battle-maneuver"]').val() != "None";
        this.isSharpshooter = html.find('[id="sharpshooter"]')[0].checked;
        this.isBlessed = html.find('[id="blessed"]')[0].checked;

        // Guessing these are character specific. Rename and/or load per character?
        this.sixConst = 6 
        this.fourConst = 4
        this.twoConst = 2
    }

    getAttackFormula() {
        let attackFormula = "1d20"
        switch (attackType) {
            case AttackType.Normal:
                attackFormula = "1d20";
                break;
            case AttackType.Advantage:
                attackFormula = "3d20kh";
                break;
            case AttackType.Disadvantage:
                attackFormula = "2d20kl";
                break;
            default:
                break;
        }

        attackFormula += sixConst
        
        if (isSharpshooter) {
            attackFormula += " - 5"
        }
        if (isBlessed) {
            attackFormula += " + 1d4"
        }

        return attackFormula
    }

    getDamageFormula() {
        let damageFormula = `1d4 + ${fourConst} + ${twoConst}`
        if (isSharpshooter) {
            damageFormula += " + 10"
        }
        if (hasBattleManeuver) {
            damageFormula += " + 1d8";
        }

        return damageFormula
    }

    getAttackMessage() {
        let messageText = `${attackType}`;

        if (isSharpshooter) {
            messageText += ", Sharpshooter"
        }
    
        if (hasBattleManeuver) {
            messageText += `, ${battleManeuver}`
        }
    
        if (isBlessed) {
            messageText += ", Blessed"
        }

        return messageText
    }
}

let outputChatMessageResult = (messageText, attackRoll, damageRoll) => {
    ChatMessage.create({
        content: `
            <div class="dice-roll">
                <b>${messageText}</b>
                <div class="dice-result">
                <h4 class="dice-total">Attack Total: ${attackRoll.total}</h4>
                <div class="dice-tooltip">
                    <section class="tooltip-part">
                    <div class="dice">
                        <div>${attackRoll.formula} = ${attackRoll.total}</div>
                        <div>${attackRoll.result} = ${attackRoll.total}</div>
                        <ol class="dice-rolls">
                            <li class="roll die d20">${attackRoll.dice[0].total}</li>
                        </ol>
                    </section>
                </div>
                <h4 class="dice-total">Damage Total: ${damageRoll.total}</h4>
                <div class="dice-tooltip">
                    <section class="tooltip-part">
                        <div>${damageRoll.formula} = ${damageRoll.total}</div>
                        <div>${damageRoll.result} = ${damageRoll.total}</div>
                    </section>
                </div>
                </div>
            </div>
        `,
    });
}

let primaryButtonCallback = async (html) => {
    let attackSummary = AttackSummary(html);

    let attackFormula = attackSummary.getAttackFormula();
    let damageFormula = attackSummary.getDamageFormula();
    
    let attackRoll = await new Roll(attackFormula).roll();
    let damageRoll = await new Roll(damageFormula).roll();

    //TODO: Roll dice on screen

    outputChatMessageResult(
        messageText=attackFormula.getAttackMessage(),
        attackRoll=attackRoll,
        damageRoll=damageRoll
    );
}

async function main(){
    let dialog = new Dialog({
        title: dialogTitle,
        content: mainHtml,
        buttons: {
            one: new DialogButton(
                icon="<i class='fas fa-bullseye'></i>",
                label="Attack!",
                callback=primaryButtonCallback
            )
        },
    });
    dialog.render(true)
}

main();
