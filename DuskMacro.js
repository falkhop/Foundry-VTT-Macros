// A macro for various combinations of attack and damage possibilities for Moon in Dusk, a Soul Knife Rogue.

//Additional Todos:
//1. Add weapon select based on character inventory
//2. Tie in checks for resource availability (psyonic energy dice, etc)
//3. Update count of remaining resources when resource is used


const mainHtml = `
    <head>
    <style>
    input {
        vertical-align: -3px;
    }
    </style>
    </head>
    <form>   
        <fieldset>
        <legend>Attack Options</legend>
        <div>
            <label>Attack Type:</label>
            <select id="attack-type" name="attack-type">
                <option value="Normal">Normal</option>
                <option value="Advantage">Advantage</option>
                <option value="Disadvantage">Disadvantage</option>
            </select>
        </div>
        <p><strong>Sneak Attack</strong></p>
        <div>
            <p> 
                Once per turn, you can deal an extra damage to one creature you hit with an attack with
                a finesse or ranged weapon if:
            </p>
            <p>
                - you have advantage on the attack roll
            </p>
            <p>
                OR
            </p>
            <p>
                - if another enemy of the target is within 5 ft. of it
            </p>
            <p>
                AS LONG AS you don’t have disadvantage on the attack roll.
            </p>
        </div>
        <div>
            <input type="checkbox" id="sneak-attack" value="sneak-attack">        
            <label for="sneak-attack">Sneak Attack</label>
        </div>
        <div>
            <p><strong>Psychic Blades</strong></p>
        </div>
        <div>
            <p>
                Whenever you take the Attack action, 
                you can manifest a psychic blade from your free hand and 
                make an attack (simple melee weapon w/ finesse, thrown, range 60 ft.).
            </p>
        </div>
        <div>
            <p>
                After you attack with the blade, you can make a melee or ranged 
                weapon attack with a second psychic blade as a bonus action on 
                the same turn, provided your other hand is free to create it.   
                The damage die of this bonus attack is 1d4, instead of 1d6.
            </p>
        </div>
        <div>
            <input type="checkbox" id="psychic-blade" value="psychic-blade" onclick="var input = document.getElementById('psychic-blade-bonus'); if(this.checked){ input.disabled = true; input.focus();}else{input.disabled=false;}">    
            <label for="psychic-blade">Psychic Blade</label>
        </div>
        <div>
            <input type="checkbox" id="psychic-blade-bonus" value="psychic-blade-bonus" onclick="var input = document.getElementById('psychic-blade'); if(this.checked){ input.disabled = true; input.focus();}else{input.disabled=false;}">   
            <label for="psychic-blade-bonus">Psychic Blade (Bonus Action Attack)</label>
        </div>
        <div>
            <input type="checkbox" id="blessed" value="blessed">   
            <label for="blessed">Blessed</label>
        </div>
        </fieldset>
    </form>
`

const AttackType = {
    Normal: "Normal",
    Advantage: "Advantage",
    Disadvantage: "Disadvantage"
}

class ActionSummary {
    constructor(html) {
        this.attackType = html.find('[id="attack-type"]').val();
        this.isSneakAttack = html.find('[id="sneak-attack"]')[0].checked;
        this.isPsychicBlade = html.find('[id="psychic-blade"]')[0].checked;
        this.isPsychicBladeBonusAction = html.find('[id="psychic-blade-bonus"]')[0].checked;
        this.isBlessed = html.find('[id="blessed"]')[0].checked;

        this.attackStatModifier = token.actor.data.data.abilities.dex.mod;
        this.proficiencyModifier = token.actor.data.data.attributes.prof;
        this.attackModifier = this.attackStatModifier + this.proficiencyModifier;
        this.sneakAttackDice = 2;
        this.critModifier = 1;
        this.attackRoll = null;
        this.damageRoll = null;
    }

    getAttackFormula() {
        let attackFormula = "1d20";
        switch (this.attackType) {
            case AttackType.Normal:
                attackFormula = "1d20";
                break;
            case AttackType.Advantage:
                attackFormula = "2d20kh";
                break;
            case AttackType.Disadvantage:
                attackFormula = "2d20kl";
                break;
            default:
                break;
        }

        attackFormula += ` + ${this.attackModifier}`;

        if (this.isBlessed) {
            attackFormula += " + 1d4";
        }

        return attackFormula;
    }

    getDamageFormula() {
        let numWeaponDice = 1 * this.critModifier;
        let numSneakAttackDice = this.sneakAttackDice * this.critModifier;
        let damageFormula = "";
        
        if (this.isPsychicBlade){
            damageFormula += `${numWeaponDice}d6[psychic]`
        } else if (this.isPsychicBladeBonusAction) {
            damageFormula += `${numWeaponDice}d4[psychic]`
        } else {
            damageFormula += `${numWeaponDice}d8[piercing]`
        }

        if (this.isSneakAttack) {
            damageFormula += `+ ${numSneakAttackDice}d6`;
        }
        
        damageFormula += `+ ${this.attackModifier}`;

        return damageFormula;
    }

    getAttackMessage() {
        let messageText = `${this.attackType}`;

        if (this.isPsychicBlade) {
            messageText += ", Psychic Blade";
        }

        if (this.isPsychicBladeBonusAction) {
            messageText += ", Psychic Blade (Bonus Action Attack)";
        }

        if (this.isSneakAttack) {
            messageText += ", Sneak Attack";
        }
        
        if (this.isBlessed) {
            messageText += ", Blessed";
        }

        return messageText;
    }

    async performAnimation() {
        let arrowAnimationMacro = game.macros.find(m => m.name === "ArrowAnimation");
        let sneakAttackAnimationMacro = game.macros.find(m => m.name === "SneakAttackAnimation");
        let psychicBladeAnimationMactro = game.macros.find(m => m.name === "PsychicBladeAnimation");
        let targets = [];
        
        game.user.targets.forEach(i => {
            let name = i.name;
            targets.push(name)});
        
        if (targets.length > 0) {
            if (!this.isPsychicBlade && !this.isPsychicBladeBonusAction){
                arrowAnimationMacro.execute();
            } else {
                psychicBladeAnimationMactro.execute();
            }

            if(this.isSneakAttack){
                sneakAttackAnimationMacro.execute();
            }
        } else {
            console.log("Animation cancelled: No Target Found.")
        }
    }

    async performAttackRollAsync() {
        let attackFormula = this.getAttackFormula();
        this.attackRoll = await new Roll(attackFormula).roll();
        if(this.attackRoll.dice[0].total == 20) {
            this.critModifier = 2;
        }
    }

    async performDamageRollAsync() {
        let damageFormula = this. getDamageFormula();
        this.damageRoll = await new Roll(damageFormula).roll();
    }
}

let outputChatMessageResult = (messageText, attackRoll, damageRoll) => {
    let pool = PoolTerm.fromRolls([attackRoll, damageRoll]);
    let roll = Roll.fromTerms([pool]);
    let d20Roll = attackRoll.dice[0].total;
    let d20IconClass = d20Roll == 20 ? " max" : d20Roll == 1 ? " min" : "";
    let chatOptions = {
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        roll: roll,
        rollMode: game.settings.get("core", "rollMode"),
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
                            <li class="roll die d20${d20IconClass}">${d20Roll}</li>
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
        `
    }
    ChatMessage.create(chatOptions);
}

let primaryButtonCallback = async (html) => {
    let actionSummary = new ActionSummary(html);
    await actionSummary.performAttackRollAsync();
    await actionSummary.performDamageRollAsync();

    outputChatMessageResult(
        messageText=actionSummary.getAttackMessage(),
        attackRoll=actionSummary.attackRoll,
        damageRoll=actionSummary.damageRoll
    );

    await actionSummary.performAnimation();
}

async function main(){
    let dialog = new Dialog({
        title: "They'll never see me coming...",
        content: mainHtml,
        buttons: {
            yes: {
                icon:"<i class='fas fa-bullseye'></i>",
                label:"Attack!",
                callback: primaryButtonCallback
            },
            no: {
                icon: "<i class='fas fa-times'></i>",
                label: "Cancel"
            },
        },
    });
    dialog.render(true)
}

main();
